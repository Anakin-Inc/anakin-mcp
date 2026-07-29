"""Syncs data from Anakin (https://anakin.io) — a web scraping, search, and
automation API — for a configured search prompt plus several account-wide,
synchronous read endpoints. Anakin turns any website into clean markdown or
AI-extracted structured JSON; Wire runs pre-built automation actions across
hundreds of sites; Website Monitoring watches pages for changes; AI
Visibility compares what AI answer engines say about a query.

This connector covers every endpoint in Anakin's API that is genuinely
SYNCHRONOUS end to end — either a single request/response with no job to
poll, or a bounded sequence of such requests (list-then-detail, still no
polling). It deliberately excludes `scrape`, `crawl`, `map`, `agentic-search`,
and Wire action execution (`wire_read_action`/`wire_write_action`) — those
submit an async job and require polling `GET /jobs/{id}` (or
`GET /wire/jobs/{id}`) to a terminal state, which doesn't fit Fivetran's
schema()/update() sync model (no polling primitive) without real
incremental-sync design work. See README.md for the full breakdown of what's
covered vs excluded and why.
"""

# Keeps `str | None`-style annotations below from being evaluated eagerly at
# import time, so this file stays compatible with the SDK's documented
# Python 3.9 floor (bare `X | Y` unions raise TypeError on 3.9 without this).
from __future__ import annotations

import json
from urllib.parse import quote

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

BASE_URL = "https://api.anakin.io/v1"


def validate_configuration(configuration: dict):
    """Ensure required configuration values are present.

    Args:
        configuration: a dictionary that holds the configuration settings for the connector.
    Raises:
        ValueError: if any required configuration parameter is missing.
    """
    required_configs = ["api_key", "search_prompt"]
    for key in required_configs:
        if key not in configuration:
            raise ValueError(f"Missing required configuration value: {key}")


def schema(configuration: dict):
    """Define the schema this connector delivers.

    `search_results` is the original table (one row per result for the
    configured search prompt). The remaining tables cover Anakin's other
    synchronous, no-polling endpoints — each is a small, bounded listing
    (account-wide resource or single ranked-results call), so every sync
    re-lists it in full and upserts, the same "no natural incremental
    cursor, re-run and let the primary key dedupe" approach already used by
    `search_results`.

    Args:
        configuration: a dictionary that holds the configuration settings for the connector.
    """
    return [
        {
            "table": "search_results",
            "primary_key": ["url"],
            "columns": {
                "url": "STRING",
                "title": "STRING",
                "snippet": "STRING",
                "date": "STRING",
                "last_updated": "STRING",
            },
        },
        {
            # GET /ai-visibility/sources — the roster of AI answer engines
            # ai_visibility_search can target. Small, account-independent,
            # no input required.
            "table": "ai_visibility_sources",
            "primary_key": ["slug"],
            "columns": {
                "slug": "STRING",
                "label": "STRING",
            },
        },
        {
            # GET /wire/catalog — every site Wire supports and its action
            # count. No input required; not paginated (confirmed against
            # the real openapi.yaml — CatalogEntry has no cursor/offset).
            "table": "wire_catalog",
            "primary_key": ["slug"],
            "columns": {
                "id": "STRING",
                "slug": "STRING",
                "name": "STRING",
                "url": "STRING",
                "domain": "STRING",
                "category": "STRING",
                "description": "STRING",
                "logo_url": "STRING",
                "auth_type": "STRING",
                "auth_login_url": "STRING",
                "status": "STRING",
                "created_at": "STRING",
                "updated_at": "STRING",
            },
        },
        {
            # GET /wire/resolve?q=... — ranked Wire actions for a
            # configured natural-language intent (`wire_discover_query`).
            # Synchronous and stateless per call, same shape as
            # search_results: re-run every sync, upsert on action_id.
            "table": "wire_discover_results",
            "primary_key": ["action_id"],
            "columns": {
                "action_id": "STRING",
                "catalog": "STRING",
                "params_required": "STRING",
                "params_optional": "STRING",
            },
        },
        {
            # GET /sessions — saved browser-session login states, an
            # account-wide resource with no per-item request shape. Field
            # names taken from the published anakin-py SDK's BrowserSession
            # model (confirmed, not guessed).
            "table": "sessions",
            "primary_key": ["id"],
            "columns": {
                "id": "STRING",
                "name": "STRING",
                "website_url": "STRING",
                "website_domain": "STRING",
                "created_at": "STRING",
                "last_used_at": "STRING",
                "expires_at": "STRING",
            },
        },
        {
            # GET /monitors — every website monitor on the account. Not in
            # any published Anakin SDK, so exact field names beyond a
            # handful of high-confidence ones (drawn from what
            # POST /monitors is documented to accept) aren't independently
            # confirmed against a live response; `raw_json` carries the
            # full object (minus the redacted alert secret) so nothing is
            # silently dropped if a guessed field name is wrong.
            "table": "monitors",
            "primary_key": ["id"],
            "columns": {
                "id": "STRING",
                "url": "STRING",
                "scope": "STRING",
                "watch_mode": "STRING",
                "raw_json": "STRING",
            },
        },
        {
            # GET /monitors/{id}/changes — detected changes per monitor.
            # Requires a monitor id per call; this connector auto-discovers
            # ids from the monitors sync above rather than asking the user
            # to hand-maintain an id list in configuration.json (still
            # purely synchronous — a bounded list-then-detail fan-out, not
            # polling). Same unconfirmed-field-names caveat as `monitors`,
            # so `raw_json` again carries the full change object.
            "table": "monitor_changes",
            "primary_key": ["monitor_id", "change_id"],
            "columns": {
                "monitor_id": "STRING",
                "change_id": "STRING",
                "detected_at": "STRING",
                "raw_json": "STRING",
            },
        },
    ]


def _get_json(path: str, api_key: str, params: dict | None = None):
    """GET an Anakin endpoint and return its parsed JSON body.

    Shared by every synchronous read endpoint this connector covers.

    Args:
        path: request path relative to BASE_URL, e.g. "/sessions".
        api_key: the Anakin API key.
        params: optional query-string parameters.
    Raises:
        RuntimeError: on a non-2xx response or network failure, naming the
            failing endpoint so a sync failure is attributable.
    """
    try:
        response = requests.get(
            f"{BASE_URL}{path}",
            headers={"X-API-Key": api_key},
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise RuntimeError(f"Failed to call Anakin {path}: {str(e)}")


def _unwrap_list(body, key: str) -> list:
    """Tolerate the response shapes Anakin returns for collection endpoints:
    a bare list, `{"<key>": [...]}`, or `{"<key>": null}` / `{}` (empty).

    Mirrors the same defensive helper used by `anakin-tap-anakin` for these
    same endpoint families (`tap_anakin/streams.py::_unwrap_list`).
    """
    if isinstance(body, list):
        return body
    if not isinstance(body, dict):
        return []
    items = body.get(key)
    return items if isinstance(items, list) else []


def _json_str(value):
    """Serialize a nested list/dict field to a JSON string for a STRING
    column; pass scalars through unchanged."""
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return value


def sync_ai_visibility_sources(api_key: str):
    """Sync the GET /ai-visibility/sources roster. No input required."""
    body = _get_json("/ai-visibility/sources", api_key)
    sources = _unwrap_list(body, "sources")
    for source in sources:
        if not isinstance(source, dict):
            continue
        op.upsert(
            table="ai_visibility_sources",
            data={
                "slug": source.get("slug") or source.get("id") or "",
                "label": source.get("label") or source.get("name"),
            },
        )
    log.info(f"Processing {len(sources)} AI visibility source(s)")


def sync_wire_catalog(api_key: str):
    """Sync GET /wire/catalog. No input required; not paginated."""
    body = _get_json("/wire/catalog", api_key)
    catalogs = _unwrap_list(body, "catalog")
    for entry in catalogs:
        if not isinstance(entry, dict):
            continue
        op.upsert(
            table="wire_catalog",
            data={
                "id": entry.get("id"),
                "slug": entry.get("slug"),
                "name": entry.get("name"),
                "url": entry.get("url"),
                "domain": entry.get("domain"),
                "category": entry.get("category"),
                "description": entry.get("description"),
                "logo_url": entry.get("logo_url"),
                "auth_required": entry.get("auth_required"),
                "auth_type": entry.get("auth_type"),
                "auth_types": _json_str(entry.get("auth_types")),
                "auth_login_url": entry.get("auth_login_url"),
                "supported_sources": _json_str(entry.get("supported_sources")),
                "status": entry.get("status"),
                "action_count": entry.get("action_count"),
                "created_at": entry.get("created_at"),
                "updated_at": entry.get("updated_at"),
            },
        )
    log.info(f"Processing {len(catalogs)} Wire catalog entr{'y' if len(catalogs) == 1 else 'ies'}")


def sync_wire_discover(api_key: str, query: str | None, limit: int):
    """Sync GET /wire/resolve?q=... for the configured `wire_discover_query`.

    Skipped (with a log message, not an error) when no query is configured
    — there's no natural default intent to resolve, the same reasoning
    `wire_actions`/`monitor_ids` are optional-and-skippable config in
    anakin-tap-anakin's equivalent streams.
    """
    if not query:
        log.info(
            "wire_discover_query not configured; skipping wire_discover_results sync"
        )
        return
    body = _get_json("/wire/resolve", api_key, params={"q": query, "limit": limit})
    results = body.get("results", []) if isinstance(body, dict) else []
    for result in results:
        if not isinstance(result, dict):
            continue
        params = result.get("params") or {}
        op.upsert(
            table="wire_discover_results",
            data={
                "action_id": result.get("action_id"),
                "catalog": result.get("catalog"),
                "credits": result.get("credits"),
                "auth_required": result.get("auth_required"),
                "auth_satisfied": result.get("auth_satisfied"),
                "params_required": _json_str(params.get("required")),
                "params_optional": _json_str(params.get("optional")),
            },
        )
    log.info(f"Processing {len(results)} Wire discover result(s) for query {query!r}")


def sync_sessions(api_key: str, domain: str | None):
    """Sync GET /sessions, optionally filtered to `session_domain`."""
    body = _get_json("/sessions", api_key, params={"domain": domain} if domain else None)
    sessions = _unwrap_list(body, "sessions")
    for session in sessions:
        if not isinstance(session, dict):
            continue
        op.upsert(
            table="sessions",
            data={
                "id": session.get("sessionId") or session.get("id"),
                "name": session.get("name"),
                "website_url": session.get("websiteUrl"),
                "website_domain": session.get("websiteDomain"),
                "is_active": session.get("isActive"),
                "created_at": session.get("createdAt"),
                "last_used_at": session.get("lastUsedAt"),
                "expires_at": session.get("expiresAt"),
                "cookie_count": session.get("cookieCount"),
                "storage_item_count": session.get("storageItemCount"),
            },
        )
    log.info(f"Processing {len(sessions)} browser session(s)")


def sync_monitors(api_key: str) -> list:
    """Sync GET /monitors. Returns the synced monitor ids so
    sync_monitor_changes can fan out per id without requiring the user to
    hand-maintain an id list in configuration.json.
    """
    body = _get_json("/monitors", api_key)
    monitors = _unwrap_list(body, "monitors")
    monitor_ids = []
    for monitor in monitors:
        if not isinstance(monitor, dict):
            continue
        monitor_id = monitor.get("id") or monitor.get("monitorId") or ""
        if not monitor_id:
            continue
        monitor_ids.append(monitor_id)
        op.upsert(
            table="monitors",
            data={
                "id": monitor_id,
                "url": monitor.get("url"),
                "scope": monitor.get("scope"),
                "watch_mode": monitor.get("watchMode"),
                # Full object verbatim, minus the redacted alert-webhook
                # HMAC secret (same field anakin-mcp's monitor.ts strips
                # before it reaches an LLM) — a secret that lands in a
                # synced destination table is exposed to everyone who can
                # query it; the real value is only ever read from the
                # dashboard.
                "raw_json": json.dumps(
                    {k: v for k, v in monitor.items() if k != "alertWebhookSecret"}
                ),
            },
        )
    log.info(f"Processing {len(monitor_ids)} monitor(s)")
    return monitor_ids


def sync_monitor_changes(api_key: str, monitor_ids: list):
    """Sync GET /monitors/{id}/changes for every id from sync_monitors.

    A bounded list-then-detail fan-out (monitor caps are 5/20/100 per plan),
    not polling — still a purely synchronous read per call.
    """
    total = 0
    for monitor_id in monitor_ids:
        body = _get_json(f"/monitors/{quote(str(monitor_id), safe='')}/changes", api_key)
        changes = _unwrap_list(body, "changes")
        for idx, change in enumerate(changes):
            if not isinstance(change, dict):
                continue
            change_id = change.get("id") or change.get("changeId") or str(idx)
            op.upsert(
                table="monitor_changes",
                data={
                    "monitor_id": monitor_id,
                    "change_id": change_id,
                    "detected_at": change.get("detectedAt") or change.get("createdAt"),
                    "raw_json": json.dumps(change),
                },
            )
            total += 1
    log.info(f"Processing {total} monitor change(s) across {len(monitor_ids)} monitor(s)")


def update(configuration: dict, state: dict):
    """Run one Anakin AI search per sync and upsert the results, then sync
    every other synchronous, no-polling Anakin endpoint this connector
    covers (AI Visibility sources, Wire catalog/discover, sessions,
    monitors, monitor changes).

    Anakin's search endpoint is synchronous (no polling) and stateless per
    call — there's no natural "since last sync" cursor for a search query,
    so every sync re-runs the search and upserts the current result set
    (primary-keyed on `url`, so re-running is idempotent, not duplicative).
    The same reasoning applies to every table below: each is a small,
    bounded listing with no incremental cursor, so every sync re-lists it
    in full.

    Args:
        configuration: A dictionary containing connection details
        state: A dictionary containing state information from previous runs
    """
    validate_configuration(configuration=configuration)

    api_key = configuration.get("api_key")
    search_prompt = configuration.get("search_prompt")
    limit = int(configuration.get("search_limit", 5))

    try:
        response = requests.post(
            f"{BASE_URL}/search",
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            json={"prompt": search_prompt, "limit": limit},
            timeout=30,
        )
        response.raise_for_status()
        body = response.json()
        results = body.get("results", [])

        log.info(f"Processing {len(results)} result(s)")

        for record in results:
            op.upsert(table="search_results", data=record)

        search_id = body.get("id")
        log.info(f"Data synced successfully. Search id: {search_id}")

    except requests.RequestException as e:
        raise RuntimeError(f"Failed to sync data from Anakin: {str(e)}")

    # ── Additional synchronous, no-polling Anakin capabilities ─────────────
    # See README.md's "Capabilities covered" for why these fit the sync
    # connector model the same way /v1/search does, and what's still
    # excluded (async job endpoints requiring polling).
    sync_ai_visibility_sources(api_key)
    sync_wire_catalog(api_key)

    wire_discover_query = configuration.get("wire_discover_query")
    wire_discover_limit = int(configuration.get("wire_discover_limit", 5))
    sync_wire_discover(api_key, wire_discover_query, wire_discover_limit)

    session_domain = configuration.get("session_domain") or None
    sync_sessions(api_key, session_domain)

    monitor_ids = sync_monitors(api_key)
    sync_monitor_changes(api_key, monitor_ids)

    op.checkpoint({"last_search_id": search_id})


connector = Connector(update=update, schema=schema)

if __name__ == "__main__":
    with open("configuration.json", "r") as f:
        configuration = json.load(f)
    connector.debug(configuration=configuration)
