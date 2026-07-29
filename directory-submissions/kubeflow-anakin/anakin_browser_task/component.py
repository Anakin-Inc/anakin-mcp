import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def run_browser_task(
    prompt: str,
    api_key: str,
    task_result: dsl.Output[dsl.Dataset],
    url: str = "",
    session_id: str = "",
    max_steps: int = -1,
    timeout_ms: int = -1,
    output_schema_json: str = "",
):
    """Run a natural-language AI browser automation task with Anakin
    (https://anakin.io) and save the outcome as a pipeline artifact.

    A real cloud browser driven by an AI agent navigates, clicks, types,
    scrolls, and extracts on your behalf ("find the cheapest 65-inch TV on
    this site and list its specs"). Use when a plain scrape can't do the
    job (multi-step flows, interactions, complex navigation) and no Wire
    action covers the site (check anakin_wire_discover first -- Wire
    actions are faster and cheaper). For login-protected tasks pass
    session_id from anakin_session_list -- never put passwords in the
    prompt. Supply output_schema_json to get structured JSON back. Refuses
    tasks that look like they complete a payment or transfer funds
    (Anthropic Connectors Directory policy, mirrored here -- see
    anakin-mcp's src/tools/policy.ts). Submits in async mode and polls
    /ai/jobs/:id (server hard-caps a run at ~5.5 minutes; this component
    polls for up to 6 minutes). Not part of the SDK's public surface yet,
    so this talks to the API directly.

    Args:
        prompt (str): The task in natural language. Be specific about the
            goal and what to return. Never include passwords or secrets --
            use session_id for authenticated sites.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        task_result (dsl.Output[dsl.Dataset]): Output artifact -- a JSON
            object {"success", "result", "steps_taken", "iterations",
            "cached", "duration_ms", "run_id"} is written here.
        url (str): Navigate here before starting. Empty string lets the
            agent follow URLs named in the prompt.
        session_id (str): Saved browser-session ID (from
            anakin_session_list) so the task runs logged in.
        max_steps (int): Cap on agent steps (navigation/click/type
            actions). -1 means unset (use the API default).
        timeout_ms (int): Task timeout in milliseconds (server caps runs
            at ~330s regardless). -1 means unset (use the API default).
        output_schema_json (str): JSON Schema (as a JSON-encoded string)
            for the result -- the agent returns structured data conforming
            to it.
    """
    import json
    import re
    import time

    import requests

    financial_pattern = re.compile(
        r"\b(payments?|pay\s?now|checkout|purchase|place\s?order|buy\s?now|"
        r"wire\s?transfer|remit(?:tance)?|payout|charge\s?card|transfer\s?funds)\b",
        re.IGNORECASE,
    )
    haystack = re.sub(r"[_-]+", " ", f"{prompt} {url}")
    if financial_pattern.search(haystack):
        raise ValueError(
            "This component does not perform financial transactions or transfer "
            "funds/assets (Anthropic Connectors Directory policy)."
        )

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    body = {"prompt": prompt, "async": True}
    if url:
        body["url"] = url
    if session_id:
        body["session_id"] = session_id
    if max_steps >= 0:
        body["max_steps"] = max_steps
    if timeout_ms >= 0:
        body["timeout_ms"] = timeout_ms
    if output_schema_json:
        body["output_schema"] = json.loads(output_schema_json)

    print(f"Submitting browser task: {prompt!r}")
    submit = requests.post(f"{base_url}/ai/evaluate", headers=headers, json=body, timeout=30)
    submit.raise_for_status()
    accepted = submit.json()
    workflow_id = accepted.get("workflow_id")

    if not workflow_id:
        # Service answered synchronously (shouldn't happen with async: true).
        job = accepted
    else:
        deadline = time.time() + 360
        job = {}
        while True:
            poll = requests.get(f"{base_url}/ai/jobs/{workflow_id}", headers=headers, timeout=30)
            poll.raise_for_status()
            job = poll.json()
            status = job.get("status")
            if status == "completed":
                break
            if status in ("failed", "timed_out"):
                raise RuntimeError(f"Browser task {status}: {job.get('error', 'unknown error')}")
            if time.time() >= deadline:
                raise TimeoutError("Anakin browser task timed out after 6 minutes of polling")
            time.sleep(3)

    result = job.get("result") if isinstance(job, dict) and job.get("result") is not None else job
    steps = result.get("steps") if isinstance(result, dict) else None
    run_id = result.get("run_id") if isinstance(result, dict) else None
    print(f"Browser task completed (run_id={run_id})")

    payload = {
        "success": result.get("success") if isinstance(result, dict) else None,
        "result": result.get("result") if isinstance(result, dict) else None,
        "steps_taken": len(steps) if isinstance(steps, list) else None,
        "iterations": result.get("iterations") if isinstance(result, dict) else None,
        "cached": result.get("cached") if isinstance(result, dict) else None,
        "duration_ms": result.get("duration_ms") if isinstance(result, dict) else None,
        "run_id": run_id,
    }
    with open(task_result.path, "w") as f:
        json.dump(payload, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        run_browser_task,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
