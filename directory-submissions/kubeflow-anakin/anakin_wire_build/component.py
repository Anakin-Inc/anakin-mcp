import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def request_wire_build(
    website_url: str,
    goal: str,
    api_key: str,
    wire_build_status: dsl.Output[dsl.Dataset],
    catalog_id: str = "",
    visibility: str = "private",
    force: bool = False,
):
    """Request a brand-new Anakin Wire (https://anakin.io) action for a
    website that isn't in the catalog yet, and save the build status as a
    pipeline artifact.

    Describe the site (website_url) and what the action should do or
    extract (goal); Wire generates and auto-tests a scraper, then publishes
    it. Asynchronous -- returns status "pending" immediately (this
    component does not poll it to completion); charges credits, refunded
    automatically if the build fails. Only use after anakin_wire_discover /
    anakin_wire_catalog confirm no existing action covers the site. Refuses
    goals that look like they complete a payment or transfer funds
    (Anthropic Connectors Directory policy, mirrored here for pipeline
    safety -- see anakin-mcp's src/tools/policy.ts). Synchronous POST; not
    part of the SDK's public surface yet, so this talks to the API
    directly.

    Args:
        website_url (str): The site to build an action for. The domain is
            extracted automatically.
        goal (str): Natural-language description of what the action should
            do or extract. Be specific -- the builder synthesizes the
            scraper from this.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        wire_build_status (dsl.Output[dsl.Dataset]): Output artifact -- the
            raw build-request JSON response is written here.
        catalog_id (str): Optional -- attach to an existing catalog instead
            of creating one.
        visibility (str): Action visibility, "private" or "public".
            Defaults to "private".
        force (bool): Build even if similar actions already exist for the
            domain (otherwise the request is rejected with ACTION_EXISTS).
            Defaults to False.
    """
    import json
    import re

    import requests

    financial_pattern = re.compile(
        r"\b(payments?|pay\s?now|checkout|purchase|place\s?order|buy\s?now|"
        r"wire\s?transfer|remit(?:tance)?|payout|charge\s?card|transfer\s?funds)\b",
        re.IGNORECASE,
    )
    haystack = re.sub(r"[_-]+", " ", f"{goal} {website_url}")
    if financial_pattern.search(haystack):
        raise ValueError(
            "This component does not build financial-transaction or fund-transfer "
            "actions (Anthropic Connectors Directory policy)."
        )

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    body = {"website_url": website_url, "goal": goal, "visibility": visibility, "force": force}
    if catalog_id:
        body["catalog_id"] = catalog_id

    print(f"Requesting a new Wire action for {website_url}")
    resp = requests.post(f"{base_url}/wire/build-request", headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    print(f"Build request status: {result.get('status', 'unknown')}")

    with open(wire_build_status.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        request_wire_build,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
