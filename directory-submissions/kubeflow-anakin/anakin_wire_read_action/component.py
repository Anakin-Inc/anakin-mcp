import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def run_wire_read_action(
    action_id: str,
    api_key: str,
    action_result: dsl.Output[dsl.Dataset],
    params_json: str = "{}",
):
    """Run an Anakin Wire (https://anakin.io) READ action -- one that
    EXTRACTS data and does not change state on the target site -- and save
    its result as a pipeline artifact.

    Wire is Anakin's catalog of pre-built automation actions across
    hundreds of sites (search listings, fetch a category's products, get a
    product's price/specs/reviews, read a profile, pull dashboard metrics).
    Discover action_ids first with anakin_wire_discover or
    anakin_wire_catalog and confirm the action's type is "read"; use
    anakin_wire_write_action for state-changing (type "write") actions
    instead. Submits the job and polls until it completes or fails.

    Note: anakin-sdk v0.1.0's wire() method does not yet accept
    credential_id/identity_id (unlike the raw /v1/wire/task endpoint), so
    this component currently only runs actions whose auth_mode is "none".
    For auth-required read actions, call the API directly with a
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

    from anakin import Anakin
    from anakin.errors import WireAuthRequiredError

    params = json.loads(params_json) if params_json else {}

    client = Anakin(api_key=api_key)
    print(f"Running Wire read action {action_id!r}")
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
        run_wire_read_action,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
