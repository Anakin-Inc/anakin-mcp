import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def list_ai_visibility_sources(
    api_key: str,
    visibility_sources: dsl.Output[dsl.Dataset],
):
    """List the AI answer engines available to Anakin's
    (https://anakin.io) AI visibility search and save them as a pipeline
    artifact.

    Each entry carries its slug (what you pass as a source to
    anakin_ai_visibility_search) and display label. Call this when you
    need to query a subset of engines or check what is currently enabled.
    Synchronous GET; not part of the SDK's public surface yet, so this
    talks to the API directly.

    Args:
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        visibility_sources (dsl.Output[dsl.Dataset]): Output artifact --
            the raw sources JSON is written here.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    print("Listing AI visibility sources")
    resp = requests.get(f"{base_url}/ai-visibility/sources", headers=headers, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    with open(visibility_sources.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        list_ai_visibility_sources,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
