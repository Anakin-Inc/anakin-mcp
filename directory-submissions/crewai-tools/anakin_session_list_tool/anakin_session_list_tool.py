from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinSessionListToolSchema(BaseModel):
    domain: str | None = Field(
        default=None,
        description='Filter to sessions for one website domain, e.g. "amazon.com"',
    )


class AnakinSessionListTool(BaseTool):
    """Tool for listing saved Anakin browser sessions — encrypted login states
    captured via the Anakin dashboard or Browser API. Each session's id is
    what you pass as session_id to AnakinScrapeTool/AnakinCrawlTool, a
    monitor, or a browser task to work with login-protected pages. If no
    session exists for a site, the user must create one interactively in the
    Anakin dashboard (log in once; 2FA/captchas included) — that flow cannot
    run from this tool. To run this tool, you need an Anakin API key — get
    one free at https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin browser session list tool"
    description: str = (
        "List saved Anakin browser sessions (encrypted login states), "
        "optionally filtered by website domain"
    )
    args_schema: type[BaseModel] = AnakinSessionListToolSchema
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

    def _run(self, domain: str | None = None) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        sessions = self._client.sessions.list(domain=domain)
        return [s.model_dump() for s in sessions]


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinSessionListTool, "_model_rebuilt", False):
        AnakinSessionListTool.model_rebuild()
        AnakinSessionListTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
