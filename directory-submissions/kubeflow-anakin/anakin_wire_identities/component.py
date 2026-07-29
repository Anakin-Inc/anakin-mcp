import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def list_wire_identities(
    api_key: str,
    wire_identities: dsl.Output[dsl.Dataset],
    catalog_id: str = "",
):
    """List saved Anakin Wire (https://anakin.io) identities and their
    credentials, and save them as a pipeline artifact.

    An identity is a named account on a site; each credential's id is the
    credential_id needed to run auth-required actions once the SDK supports
    passing one to wire() (see anakin_wire_read_action /
    anakin_wire_write_action). Synchronous GET; not part of the SDK's
    public surface yet, so this talks to the API directly.

    Args:
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        wire_identities (dsl.Output[dsl.Dataset]): Output artifact -- the
            raw identities JSON response is written here.
        catalog_id (str): Optional -- restrict to identities for a single
            catalog. Empty string means no filter.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    params = {"catalog_id": catalog_id} if catalog_id else {}

    print(f"Listing Wire identities (catalog_id={catalog_id or 'all'})")
    resp = requests.get(f"{base_url}/wire/identities", headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    with open(wire_identities.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        list_wire_identities,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
