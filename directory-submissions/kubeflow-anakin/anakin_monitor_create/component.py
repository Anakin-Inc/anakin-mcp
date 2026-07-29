import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def create_monitor(
    url: str,
    interval_minutes: int,
    api_key: str,
    monitor: dsl.Output[dsl.Dataset],
    scope: str = "page",
    watch_mode: str = "full_page",
    watch_format: str = "markdown",
    output_schema_json: str = "",
    ai_mode: bool = False,
    ai_goal: str = "",
    use_browser: bool = False,
    country: str = "us",
    session_id: str = "",
    is_active: bool = True,
    expires_at: str = "",
    alert_webhook_url: str = "",
    alert_emails: str = "",
    max_pages: int = -1,
    max_depth: int = -1,
    include_patterns_csv: str = "",
    exclude_patterns_csv: str = "",
    wire_action_id: str = "",
    wire_catalog_slug: str = "",
    wire_credential_id: str = "",
    wire_params_json: str = "",
    wire_watch_paths_csv: str = "",
):
    """Create a scheduled Anakin (https://anakin.io) website monitor and
    save it as a pipeline artifact.

    Checks a URL every interval_minutes (min 15) and records a change when
    the content differs -- optionally alerting a webhook or email. scope
    "page" (default) watches one URL; "site" crawls the site each run and
    tracks pages added/removed/changed; "wire" runs a Wire action each
    check and diffs its JSON. watch_mode "full_page" (2 credits/check)
    compares the whole page; "specific_data" (3 credits/check) extracts
    only the fields in output_schema_json with AI -- ideal for
    price/stock/status tracking. ai_mode (+1 credit/check) filters out
    trivial noise and summarizes real changes. Active-monitor caps per
    plan: Free 5, Pro 20, Scale 100. Synchronous POST; not part of the
    SDK's public surface yet, so this talks to the API directly.

    Args:
        url (str): The URL to watch (root URL for site scope; the Wire
            site's URL for wire scope).
        interval_minutes (int): Check frequency in minutes. Minimum 15.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        monitor (dsl.Output[dsl.Dataset]): Output artifact -- the created
            monitor's JSON (with its alertWebhookSecret redacted, since a
            secret that enters an artifact/log is compromised by
            definition -- retrieve the real value from the dashboard) is
            written here.
        scope (str): "page", "site", or "wire". Defaults to "page".
        watch_mode (str): "full_page" or "specific_data". Defaults to
            "full_page".
        watch_format (str): Format compared in full_page mode --
            "markdown", "html", or "cleaned_html". Defaults to "markdown".
        output_schema_json (str): JSON Schema (as a JSON-encoded string) of
            the fields to track. Required when watch_mode is
            "specific_data".
        ai_mode (bool): AI meaningful-change filtering. Defaults to False.
        ai_goal (str): Natural-language description of which changes count
            as meaningful (used with ai_mode).
        use_browser (bool): Render checks with a stealth headless browser.
            Forced true server-side when session_id is set. Defaults to
            False.
        country (str): Two-letter proxy country code. Defaults to "us".
        session_id (str): Saved browser-session ID for monitoring
            login-protected pages (see anakin_session_list).
        is_active (bool): Start running immediately. Defaults to True.
        expires_at (str): Optional end date (ISO 8601 timestamp or
            YYYY-MM-DD); the monitor auto-pauses when it passes.
        alert_webhook_url (str): Webhook URL that receives signed change
            alerts.
        alert_emails (str): Comma-separated email recipients for change
            alerts.
        max_pages (int): Site scope: max pages crawled per run. -1 means
            unset (use the API default).
        max_depth (int): Site scope: crawl depth (1-5). -1 means unset
            (use the API default of 2).
        include_patterns_csv (str): Site scope: comma-separated glob
            patterns or hand-picked same-site URLs to track.
        exclude_patterns_csv (str): Site scope: comma-separated glob
            patterns to skip.
        wire_action_id (str): Wire scope (required there): the Wire action
            run each check, e.g. "amazon.search_products" (see
            anakin_wire_discover).
        wire_catalog_slug (str): Wire scope: catalog slug of the Wire
            site.
        wire_credential_id (str): Wire scope: credential ID when the
            action needs auth (see anakin_wire_identities).
        wire_params_json (str): Wire scope: parameters passed to the
            action each check, as a JSON-encoded string.
        wire_watch_paths_csv (str): Wire scope: comma-separated JSON paths
            to diff instead of the whole response.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    body = {
        "url": url,
        "intervalMinutes": interval_minutes,
        "scope": scope,
        "watchMode": watch_mode,
        "watchFormat": watch_format,
        "aiMode": ai_mode,
        "useBrowser": use_browser,
        "country": country,
        "isActive": is_active,
    }
    if output_schema_json:
        body["outputSchema"] = json.loads(output_schema_json)
    if ai_goal:
        body["aiGoal"] = ai_goal
    if session_id:
        body["sessionId"] = session_id
    if expires_at:
        body["expiresAt"] = expires_at
    if alert_webhook_url:
        body["alertWebhookUrl"] = alert_webhook_url
    if alert_emails:
        body["alertEmails"] = alert_emails
    if max_pages >= 0:
        body["maxPages"] = max_pages
    if max_depth >= 0:
        body["maxDepth"] = max_depth
    if include_patterns_csv:
        body["includePatterns"] = [p.strip() for p in include_patterns_csv.split(",") if p.strip()]
    if exclude_patterns_csv:
        body["excludePatterns"] = [p.strip() for p in exclude_patterns_csv.split(",") if p.strip()]
    if wire_action_id:
        body["wireActionId"] = wire_action_id
    if wire_catalog_slug:
        body["wireCatalogSlug"] = wire_catalog_slug
    if wire_credential_id:
        body["wireCredentialId"] = wire_credential_id
    if wire_params_json:
        body["wireParams"] = json.loads(wire_params_json)
    if wire_watch_paths_csv:
        body["wireWatchPaths"] = [p.strip() for p in wire_watch_paths_csv.split(",") if p.strip()]

    print(f"Creating {scope} monitor for {url} every {interval_minutes}m")
    resp = requests.post(f"{base_url}/monitors", headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    if isinstance(result, dict) and result.get("alertWebhookSecret"):
        result["alertWebhookSecret"] = "[redacted -- view in the Anakin dashboard]"
    print(f"Created monitor {result.get('id', 'unknown')}")

    with open(monitor.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        create_monitor,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
