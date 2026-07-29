import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def search_ai_visibility(
    query: str,
    api_key: str,
    visibility_results: dsl.Output[dsl.Dataset],
    sources_csv: str = "",
    country: str = "us",
    include_full_content: bool = False,
):
    """Ask multiple AI answer engines (ChatGPT, Gemini, Google AI Overview)
    the same question via Anakin (https://anakin.io) and save the compared
    results as a pipeline artifact.

    Returns one result per engine -- status, an answer summary, latency,
    credits used, and a consensus/outlier verdict -- plus an AI-generated
    synthesis of where the engines agree and diverge. Useful for brand /
    AI-SEO visibility checks and geo-specific AI answers (set country).
    Billed per source at that Wire action's rate; failed sources are free.
    Submits the search and polls /ai-visibility/search/:id until it stops
    running (a partial/failed run is still written to the artifact, not
    raised, since per-source results are useful either way). Not part of
    the SDK's public surface yet, so this talks to the API directly.

    Args:
        query (str): The question to ask every engine (max 2000
            characters).
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        visibility_results (dsl.Output[dsl.Dataset]): Output artifact -- a
            JSON object {"search_id", "status", "country", "synthesis",
            "results"} is written here.
        sources_csv (str): Comma-separated engine slugs to query (see
            anakin_ai_visibility_sources). Empty string queries all
            enabled engines.
        country (str): Two-letter ISO country for the search geography
            (proxy exit). Defaults to "us".
        include_full_content (bool): Include each engine's raw full answer
            in the results (large). Defaults to False -- summaries and the
            synthesis are returned regardless.
    """
    import json
    import time

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    body = {"query": query, "country": country}
    sources = [s.strip() for s in sources_csv.split(",") if s.strip()]
    if sources:
        body["sources"] = sources

    print(f"Submitting AI visibility search: {query!r}")
    submit = requests.post(f"{base_url}/ai-visibility/search", headers=headers, json=body, timeout=30)
    submit.raise_for_status()
    search = submit.json()
    search_id = search["search_id"]

    deadline = time.time() + 180
    while search.get("status") == "running":
        if time.time() >= deadline:
            raise TimeoutError(
                f"Anakin AI visibility search {search_id} timed out after 3 minutes; "
                "poll it later via the dashboard or retry"
            )
        time.sleep(3)
        poll = requests.get(f"{base_url}/ai-visibility/search/{search_id}", headers=headers, timeout=30)
        poll.raise_for_status()
        search = poll.json()

    print(f"AI visibility search {search_id} finished with status: {search.get('status')}")

    results = search.get("results") or []
    if not include_full_content:
        results = [{k: v for k, v in r.items() if k != "full_content"} for r in results]

    payload = {
        "search_id": search.get("search_id"),
        "status": search.get("status"),
        "country": search.get("country"),
        "synthesis": search.get("synthesis"),
        "results": results,
    }
    with open(visibility_results.path, "w") as f:
        json.dump(payload, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        search_ai_visibility,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
