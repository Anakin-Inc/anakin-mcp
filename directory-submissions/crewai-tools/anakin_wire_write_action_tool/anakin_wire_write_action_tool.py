from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


# Wire never executes payments or asset transfers — the hosted Anakin API
# rejects such actions server-side, but this tool refuses obviously financial
# requests up front too, matching the policy enforced in anakin-mcp's
# wire_write_action (see src/tools/policy.ts financialBlockReason).
_FINANCIAL_KEYWORDS = (
    "checkout",
    "place order",
    "purchase",
    "pay ",
    "payment",
    "wire transfer",
    "send money",
    "transfer funds",
    "buy now",
)


class AnakinWireWriteActionToolSchema(BaseModel):
    action_id: str = Field(
        description=(
            'The Wire action to run, e.g. "linkedin.send_connection_request" '
            "(find action_ids with AnakinWireDiscoverTool or AnakinWireCatalogTool; "
            'confirm its type is "write")'
        )
    )
    params: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "The action's input parameters — shape depends on the action, from "
            "its parameter schema in discovery. Omit for actions that take none."
        ),
    )


class AnakinWireWriteActionTool(BaseTool):
    """Tool for running a Wire WRITE action via the Anakin API — one that
    performs a state-changing interaction on the target site: submit a form,
    add an item to a cart, post or send content, update account settings.
    Wire is Anakin's catalog of pre-built automation actions across hundreds
    of websites. Discover action_ids first with AnakinWireDiscoverTool or
    AnakinWireCatalogTool and confirm the action's type is "write"; for
    read-only data extraction use AnakinWireReadActionTool instead. Does not
    execute payments or transfer funds — such requests are refused. Submits
    the action and polls the async job to completion. To run this tool, you
    need an Anakin API key — get one free at https://anakin.io/dashboard
    (300 credits, no card required).

    Note: most write actions need authentication. The current anakin-sdk
    (v0.1.0) does not yet accept a credential_id override from this tool, so
    the action runs against whatever identity is connected in the Anakin
    dashboard for that site, and fails with an AUTH_REQUIRED error if none is
    connected.

    Args:
        api_key (str): Your Anakin API key.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin Wire write action tool"
    description: str = (
        "Run a Wire write action (a state-changing interaction, e.g. submit a "
        "form or post content) by action_id and return its result. Never "
        "executes payments or fund transfers."
    )
    args_schema: type[BaseModel] = AnakinWireWriteActionToolSchema
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

    def _run(self, action_id: str, params: dict[str, Any] | None = None) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        params = params or {}
        haystack = f"{action_id} {params}".lower()
        if any(keyword in haystack for keyword in _FINANCIAL_KEYWORDS):
            raise ValueError(
                "Refused: this action looks like a payment or fund transfer. "
                "Anakin Wire does not execute financial transactions."
            )

        result = self._client.wire(action_id, params)
        return result.model_dump()


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinWireWriteActionTool, "_model_rebuilt", False):
        AnakinWireWriteActionTool.model_rebuild()
        AnakinWireWriteActionTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
