import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def list_sessions(
    api_key: str,
    sessions: dsl.Output[dsl.Dataset],
    domain: str = "",
):
    """List saved Anakin (https://anakin.io) browser sessions and save them
    as a pipeline artifact.

    Saved browser sessions are encrypted login states (cookies +
    localStorage) created once via the Anakin dashboard or Browser API,
    then reused for authenticated work -- pass a listed session's id as
    session_id to anakin_web_scraper / anakin_site_crawler /
    anakin_monitor_create / anakin_browser_task. Creating a session is not
    exposed as a component: it is an interactive noVNC login flow that
    can't run inside a pipeline step.

    Args:
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        sessions (dsl.Output[dsl.Dataset]): Output artifact -- a JSON array
            of session objects (id, name, website_url, website_domain,
            is_active, created_at, last_used_at, expires_at, cookie_count,
            storage_item_count) is written here.
        domain (str): Filter to sessions for one website domain, e.g.
            "amazon.com". Empty string means no filter.
    """
    import json

    from anakin import Anakin

    client = Anakin(api_key=api_key)
    print(f"Listing browser sessions (domain={domain or 'all'})")
    result = client.sessions.list(domain=domain or None)
    print(f"Found {len(result)} session(s)")

    payload = [s.model_dump(exclude_none=True) for s in result]
    with open(sessions.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        list_sessions,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
