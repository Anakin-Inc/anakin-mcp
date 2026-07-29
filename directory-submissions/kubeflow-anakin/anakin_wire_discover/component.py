import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def discover_wire_actions(
    q: str,
    api_key: str,
    wire_actions: dsl.Output[dsl.Dataset],
    limit: int = 5,
):
    """Find Anakin Wire (https://anakin.io) actions for a task from a
    natural-language intent and save the candidates as a pipeline artifact.

    Wire is a catalog of pre-built automation actions across hundreds of
    websites (Amazon, Walmart, LinkedIn, Airbnb, Zillow, and others).
    Returns ranked candidate actions, each with its action_id, type ("read"
    or "write"), required/optional params, credit cost, and whether auth is
    needed -- feed a chosen action_id into anakin_wire_read_action or
    anakin_wire_write_action. Synchronous GET; not part of the SDK's public
    surface yet, so this talks to the API directly.

    Args:
        q (str): The intent in natural language, e.g. "top phones on
            walmart", "search airbnb listings in Lisbon".
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        wire_actions (dsl.Output[dsl.Dataset]): Output artifact -- the raw
            JSON response ("results", "next") is written here.
        limit (int): Maximum number of candidate actions to return.
            Defaults to 5.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    print(f"Resolving Wire actions for: {q!r}")
    resp = requests.get(
        f"{base_url}/wire/resolve",
        headers=headers,
        params={"q": q, "limit": limit},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"Found {len(result.get('results', []))} candidate action(s)")

    with open(wire_actions.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        discover_wire_actions,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
