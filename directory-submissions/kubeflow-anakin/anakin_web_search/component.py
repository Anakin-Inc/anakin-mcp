import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def search_web(
    prompt: str,
    api_key: str,
    search_results: dsl.Output[dsl.Dataset],
    limit: int = 5,
):
    """AI-powered web search with Anakin (https://anakin.io) and save the
    ranked results as a pipeline artifact.

    Synchronous -- returns immediately, no polling. Useful as a lightweight
    discovery step that feeds URLs into a downstream anakin_web_scraper or
    anakin_site_crawler step. Costs 3 credits per call.

    Args:
        prompt (str): The search query in natural language.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        search_results (dsl.Output[dsl.Dataset]): Output artifact -- a JSON
            object {"id": ..., "results": [{"url", "title", "snippet",
            "date"}, ...]} is written here.
        limit (int): Maximum number of results to return. Defaults to 5.
    """
    import json

    from anakin import Anakin

    client = Anakin(api_key=api_key)
    print(f"Searching for: {prompt!r} (limit={limit})")
    result = client.search(prompt, limit=limit)
    print(f"Got {len(result.results)} result(s)")

    payload = {
        "id": result.id,
        "results": [r.model_dump(exclude_none=True) for r in result.results],
    }
    with open(search_results.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        search_web,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
