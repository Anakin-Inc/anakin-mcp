import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def list_monitors(
    api_key: str,
    monitors: dsl.Output[dsl.Dataset],
    id: str = "",
):
    """List Anakin (https://anakin.io) website monitors, or fetch one by
    id, and save the result as a pipeline artifact.

    Pass id to fetch just that monitor's full configuration and status
    (next/last check time, active state, per-check credit cost, alert
    settings); omit it to list every monitor. Use this to find a monitor's
    id before anakin_monitor_changes or anakin_monitor_control. Any
    alertWebhookSecret in the response is redacted -- a secret that enters
    a pipeline artifact/log is compromised by definition; retrieve the
    real value from the dashboard. Synchronous GET; not part of the SDK's
    public surface yet, so this talks to the API directly.

    Args:
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        monitors (dsl.Output[dsl.Dataset]): Output artifact -- the raw
            monitor(s) JSON is written here.
        id (str): Monitor ID -- fetch just this monitor instead of the
            full list. Empty string lists all monitors.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    path = f"/monitors/{id}" if id else "/monitors"

    print(f"Fetching monitors ({id or 'all'})")
    resp = requests.get(f"{base_url}{path}", headers=headers, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    def redact(value):
        if isinstance(value, list):
            return [redact(v) for v in value]
        if isinstance(value, dict):
            return {
                k: (
                    "[redacted -- view in the Anakin dashboard]"
                    if k == "alertWebhookSecret" and v
                    else redact(v)
                )
                for k, v in value.items()
            }
        return value

    result = redact(result)

    with open(monitors.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        list_monitors,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
