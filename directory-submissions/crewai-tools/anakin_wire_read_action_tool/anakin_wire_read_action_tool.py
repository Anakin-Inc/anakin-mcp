from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinWireReadActionToolSchema(BaseModel):
    action_id: str = Field(
        description=(
            'The Wire action to run, e.g. "walmart.search_products" '
            "(find action_ids with AnakinWireDiscoverTool or AnakinWireCatalogTool; "
            'confirm its type is "read")'
        )
    )
    params: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "The action's input parameters — shape depends on the action, from "
            "its parameter schema in discovery. Omit for actions that take none."
        ),
    )


class AnakinWireReadActionTool(BaseTool):
    """Tool for running a Wire READ action via the Anakin API — one that
    EXTRACTS data and does not change state on the target site: search
    listings, fetch a category's products, get a product's price/specs/
    reviews, read a profile, pull dashboard metrics. Wire is Anakin's catalog
    of pre-built automation actions across hundreds of websites (Amazon,
    Walmart, LinkedIn, Airbnb, Zillow, and others). Discover action_ids first
    with AnakinWireDiscoverTool or AnakinWireCatalogTool and confirm the
    action's type is "read"; for state-changing actions (type "write") use
    AnakinWireWriteActionTool instead. Submits the action and polls the async
    job to completion. To run this tool, you need an Anakin API key — get one
    free at https://anakin.io/dashboard (300 credits, no card required).

    Note: most read actions need no authentication. A minority require an
    identity connected via the Anakin dashboard; the current anakin-sdk
    (v0.1.0) does not yet accept a credential_id override from this tool, so
    auth-required actions without a dashboard-connected identity will fail
    with an AUTH_REQUIRED error from the API.

    Args:
        api_key (str): Your Anakin API key.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin Wire read action tool"
    description: str = (
        "Run a Wire read action (data extraction only, e.g. search listings, "
        "fetch product details, read a profile) by action_id and return its result"
    )
    args_schema: type[BaseModel] = AnakinWireReadActionToolSchema
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

        result = self._client.wire(action_id, params or {})
        return result.model_dump()


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinWireReadActionTool, "_model_rebuilt", False):
        AnakinWireReadActionTool.model_rebuild()
        AnakinWireReadActionTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
