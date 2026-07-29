import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def agentic_search(
    prompt: str,
    api_key: str,
    research_result: dsl.Output[dsl.Dataset],
    schema_json: str = "",
    use_browser: bool = True,
):
    """Run Anakin's (https://anakin.io) multi-stage AI research pipeline and
    save the synthesized result as a pipeline artifact.

    Searches the web, scrapes the most relevant citations, and uses an LLM
    to structure the combined data into a unified answer. Useful for
    comparative analysis, multi-jurisdictional research, or market
    intelligence steps that a flat search or single scrape can't answer.
    Submits the job and polls until it completes or fails (the SDK's
    default poll_timeout is 300s). Costs 10 credits.

    Args:
        prompt (str): The research question or task in natural language.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        research_result (dsl.Output[dsl.Dataset]): Output artifact -- a JSON
            object {"id", "status", "summary", "structured_data",
            "data_schema", "cached"} is written here.
        schema_json (str): Optional JSON Schema (as a JSON-encoded string)
            describing the desired output shape. If empty, the engine infers
            a schema from the prompt.
        use_browser (bool): Use the headless browser when scraping cited
            pages -- more reliable for JS-heavy sources. Defaults to True.
    """
    import json

    from anakin import Anakin

    schema = json.loads(schema_json) if schema_json else None

    client = Anakin(api_key=api_key)
    print(f"Running agentic search for: {prompt!r}")
    # Raises anakin.errors.JobFailedError if the job's terminal status is
    # "failed" -- left uncaught so the component (and pipeline step) fails
    # loudly rather than silently writing a partial artifact.
    result = client.agentic_search(prompt, use_browser=use_browser, schema=schema)
    print(f"Agentic search {result.id} completed (cached={result.cached})")

    generated = result.generated_json
    payload = {
        "id": result.id,
        "status": result.status,
        "summary": generated.summary if generated else None,
        "structured_data": generated.structured_data if generated else None,
        "data_schema": generated.data_schema if generated else None,
        "cached": result.cached,
    }
    with open(research_result.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        agentic_search,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
