import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def wire_login(
    catalog_slug: str,
    api_key: str,
    wire_credential: dsl.Output[dsl.Dataset],
    params_json: str = "{}",
    identity_name: str = "",
):
    """Sign in to a credentials-mode Anakin Wire (https://anakin.io) site
    and save the resulting credential as a pipeline artifact.

    The credential_id in the output is usable immediately with
    anakin_wire_read_action / anakin_wire_write_action once the SDK's
    wire() call supports passing one (see those components' docstrings for
    the current gap). The password is never stored by Anakin, only the
    encrypted session. Only needed for actions whose auth_mode is
    "required" and only for catalogs that support password sign-in;
    cookie-based sites use the dashboard connect flow instead. Synchronous
    POST; not part of the SDK's public surface yet, so this talks to the
    API directly.

    Security note: params_json typically carries a password. Treat this
    component's inputs like any other credential -- do not hardcode
    secrets into a checked-in pipeline definition; supply them via a
    Kubeflow Secret-backed pipeline parameter instead.

    Args:
        catalog_slug (str): The catalog to sign in to (e.g. "neb").
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        wire_credential (dsl.Output[dsl.Dataset]): Output artifact -- the
            raw login JSON response (including the new credential_id) is
            written here.
        params_json (str): Login fields defined by the catalog (e.g.
            {"email": "...", "password": "..."}) as a JSON-encoded string.
            Use anakin_wire_catalog's login_input_schema to learn the
            field names.
        identity_name (str): Optional name for the identity. Derived from
            params in password mode when omitted.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    body = {"catalog_slug": catalog_slug}
    params = json.loads(params_json) if params_json else {}
    if params:
        body["params"] = params
    if identity_name:
        body["identity_name"] = identity_name

    print(f"Signing in to Wire catalog {catalog_slug!r}")
    resp = requests.post(f"{base_url}/wire/login", headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    print("Wire sign-in succeeded")

    with open(wire_credential.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        wire_login,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
