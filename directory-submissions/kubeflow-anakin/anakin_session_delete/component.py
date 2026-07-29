import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def delete_session(
    session_id: str,
    api_key: str,
    deletion_status: dsl.Output[dsl.Dataset],
):
    """Permanently delete a saved Anakin (https://anakin.io) browser session
    and save the outcome as a pipeline artifact.

    Irreversible -- the user must log in again through the dashboard to
    recreate it, and any monitors or steps referencing this session_id will
    lose authenticated access. Find ids with anakin_session_list. Useful as
    a cleanup step at the end of a pipeline that used a temporary session.

    Args:
        session_id (str): The session ID to delete (from
            anakin_session_list).
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        deletion_status (dsl.Output[dsl.Dataset]): Output artifact -- a
            JSON object {"session_id", "deleted"} is written here.
    """
    import json

    from anakin import Anakin

    client = Anakin(api_key=api_key)
    print(f"Deleting browser session {session_id}")
    client.sessions.delete(session_id)
    print(f"Deleted session {session_id}")

    payload = {"session_id": session_id, "deleted": True}
    with open(deletion_status.path, "w") as f:
        json.dump(payload, f)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        delete_session,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
