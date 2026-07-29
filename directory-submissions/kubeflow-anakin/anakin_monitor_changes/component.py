import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def get_monitor_changes(
    id: str,
    api_key: str,
    changes: dsl.Output[dsl.Dataset],
):
    """Get the detected changes for an Anakin (https://anakin.io) website
    monitor and save them as a pipeline artifact.

    Each entry records when the watched content differed from the previous
    check, with a diff/summary (and the AI change summary when ai_mode was
    on). Use anakin_monitor_list first to find the monitor id. Synchronous
    GET; not part of the SDK's public surface yet, so this talks to the
    API directly.

    Args:
        id (str): The monitor ID (from anakin_monitor_list or
            anakin_monitor_create).
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        changes (dsl.Output[dsl.Dataset]): Output artifact -- the raw
            changes JSON is written here.
    """
    import json

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    print(f"Fetching changes for monitor {id}")
    resp = requests.get(f"{base_url}/monitors/{id}/changes", headers=headers, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    with open(changes.path, "w") as f:
        json.dump(result, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        get_monitor_changes,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
