import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def run_wire_write_action(
    action_id: str,
    api_key: str,
    action_result: dsl.Output[dsl.Dataset],
    params_json: str = "{}",
):
    """Run an Anakin Wire (https://anakin.io) WRITE action -- one that
    PERFORMS a state-changing interaction on the target site (submit a
    form, add an item to a cart, post or send content, update account
    settings) -- and save its result as a pipeline artifact.

    Discover action_ids first with anakin_wire_discover or
    anakin_wire_catalog and confirm the action's type is "write"; use
    anakin_wire_read_action for data-extraction (type "read") actions
    instead. This component refuses actions that look like they complete a
    payment or transfer funds (Anthropic Connectors Directory policy,
    mirrored here for pipeline safety -- see anakin-mcp's
    src/tools/policy.ts, the source of this guard). Submits the job and
    polls until it completes or fails.

    Note: anakin-sdk v0.1.0's wire() method does not yet accept
    credential_id/identity_id (unlike the raw /v1/wire/task endpoint), so
    this component currently only runs actions whose auth_mode is "none".
    For auth-required write actions, call the API directly with a
    credential_id until the SDK adds that parameter.

    Args:
        action_id (str): The action to run (from anakin_wire_discover /
            anakin_wire_catalog).
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        action_result (dsl.Output[dsl.Dataset]): Output artifact -- a JSON
            object {"job_id", "status", "data", "credits_used",
            "execution_ms"} is written here.
        params_json (str): The action's input parameters as a JSON-encoded
            string. Shape depends on the action -- use its parameter schema
            from anakin_wire_catalog. Defaults to "{}" for actions that
            take none.
    """
    import json
    import re

    from anakin import Anakin
    from anakin.errors import WireAuthRequiredError

    financial_pattern = re.compile(
        r"\b(payments?|pay\s?now|checkout|purchase|place\s?order|buy\s?now|"
        r"wire\s?transfer|remit(?:tance)?|payout|charge\s?card|transfer\s?funds)\b",
        re.IGNORECASE,
    )
    params = json.loads(params_json) if params_json else {}
    haystack = re.sub(r"[_-]+", " ", f"{action_id} {json.dumps(params)}")
    if financial_pattern.search(haystack):
        raise ValueError(
            "This component does not perform financial transactions or transfer "
            "funds/assets (Anthropic Connectors Directory policy). Use "
            "anakin_wire_read_action to look up information, or complete any "
            "payment directly on the site."
        )

    client = Anakin(api_key=api_key)
    print(f"Running Wire write action {action_id!r}")
    try:
        result = client.wire(action_id, params)
    except WireAuthRequiredError as exc:
        raise RuntimeError(
            f"Wire action {action_id!r} requires authentication -- connect the "
            f"account first at {exc.connect_url}"
        ) from exc
    print(
        f"Wire action {action_id!r} completed "
        f"({result.credits_used} credits, {result.execution_ms}ms)"
    )

    payload = {
        "job_id": result.job_id,
        "status": result.status,
        "data": result.data,
        "credits_used": result.credits_used,
        "execution_ms": result.execution_ms,
    }
    with open(action_result.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        run_wire_write_action,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
