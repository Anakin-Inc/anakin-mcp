import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def control_monitor(
    id: str,
    action: str,
    api_key: str,
    monitor_status: dsl.Output[dsl.Dataset],
):
    """Control an existing Anakin (https://anakin.io) website monitor and
    save the outcome as a pipeline artifact.

    action "pause" stops scheduled checks, "resume" restarts them (may hit
    the plan's active-monitor cap), "run_now" triggers an immediate
    out-of-schedule check (billed like a normal check), and "delete"
    permanently removes the monitor and its history. Use
    anakin_monitor_list to find the id. Not part of the SDK's public
    surface yet, so this talks to the API directly.

    Args:
        id (str): The monitor ID (from anakin_monitor_list or
            anakin_monitor_create).
        action (str): One of "pause", "resume", "run_now", "delete".
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        monitor_status (dsl.Output[dsl.Dataset]): Output artifact -- the
            raw response JSON is written here.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    base = f"{base_url}/monitors/{id}"

    action_map = {
        "pause": ("POST", f"{base}/pause"),
        "resume": ("POST", f"{base}/resume"),
        "run_now": ("POST", f"{base}/run"),
        "delete": ("DELETE", base),
    }
    if action not in action_map:
        raise ValueError(f'Unknown monitor action "{action}" -- use pause, resume, run_now, or delete.')
    method, url = action_map[action]

    print(f"Monitor {id}: {action}")
    resp = requests.request(method, url, headers=headers, timeout=30)
    resp.raise_for_status()
    result = resp.json() if resp.content else {"id": id, "action": action, "status": "ok"}

    with open(monitor_status.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        control_monitor,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
