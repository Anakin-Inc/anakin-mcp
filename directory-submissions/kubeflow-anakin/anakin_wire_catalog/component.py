import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def get_wire_catalog(
    api_key: str,
    wire_catalog: dsl.Output[dsl.Dataset],
    slug: str = "",
):
    """Browse the Anakin Wire (https://anakin.io) catalog and save the
    result as a pipeline artifact.

    With no slug, lists every supported website and its action count. Pass
    a catalog slug (e.g. "walmart", "amazon", "linkedin") to get that
    site's full action list with exact parameter schemas, each action's
    type (read/write), auth mode, and credit cost. Synchronous GET; not
    part of the SDK's public surface yet, so this talks to the API
    directly.

    Args:
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        wire_catalog (dsl.Output[dsl.Dataset]): Output artifact -- the raw
            catalog JSON response is written here.
        slug (str): Catalog slug to inspect (e.g. "walmart"). Empty string
            lists all catalogs.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    path = f"/wire/catalog/{slug}" if slug else "/wire/catalog"

    print(f"Fetching Wire catalog ({slug or 'all sites'})")
    resp = requests.get(f"{base_url}{path}", headers=headers, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    with open(wire_catalog.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        get_wire_catalog,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
