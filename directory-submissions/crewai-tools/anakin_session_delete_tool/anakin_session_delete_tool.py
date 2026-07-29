from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinSessionDeleteToolSchema(BaseModel):
    session_id: str = Field(
        description="The session ID to delete (from AnakinSessionListTool)"
    )


class AnakinSessionDeleteTool(BaseTool):
    """Tool for permanently deleting a saved Anakin browser session and its
    encrypted login data. Irreversible — the user must log in again through
    the Anakin dashboard to recreate it, and any monitors or requests
    referencing this session_id will lose authenticated access. Find ids with
    AnakinSessionListTool. To run this tool, you need an Anakin API key — get
    one free at https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin browser session delete tool"
    description: str = (
        "Permanently delete a saved Anakin browser session and its encrypted "
        "login data. Irreversible."
    )
    args_schema: type[BaseModel] = AnakinSessionDeleteToolSchema
    api_key: str | None = None

    _client: Any = PrivateAttr(None)
    package_dependencies: list[str] = Field(default_factory=lambda: ["anakin-sdk"])
    env_vars: list[EnvVar] = Field(
        default_factory=lambda: [
            EnvVar(
                name="ANAKIN_API_KEY",
                description="API key for Anakin services",
                required=True,
            ),
        ]
    )

    def __init__(self, api_key: str | None = None, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        try:
            from anakin import Anakin
        except ImportError:
            import click

            if click.confirm(
                "You are missing the 'anakin-sdk' package. Would you like to install it?"
            ):
                import subprocess

                subprocess.run(["uv", "add", "anakin-sdk"], check=True)  # noqa: S607
                from anakin import Anakin
            else:
                raise ImportError(
                    "`anakin-sdk` package not found, please run `uv add anakin-sdk`"
                ) from None

        self._client = Anakin(api_key=api_key)

    def _run(self, session_id: str) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        self._client.sessions.delete(session_id)
        return {"deleted": True, "session_id": session_id}


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinSessionDeleteTool, "_model_rebuilt", False):
        AnakinSessionDeleteTool.model_rebuild()
        AnakinSessionDeleteTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
