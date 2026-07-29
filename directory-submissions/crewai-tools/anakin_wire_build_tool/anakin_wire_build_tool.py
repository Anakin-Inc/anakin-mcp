from __future__ import annotations

import os
from typing import Any, Literal

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30

# Wire never builds payment/transfer actions — the hosted Anakin API rejects
# such requests server-side, but this tool refuses obviously financial
# requests up front too, matching anakin-mcp's wire_build (see
# src/tools/policy.ts financialBlockReason).
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


def _error_message(method: str, path: str, resp: requests.Response) -> str:
    message = f"{method} {path} failed ({resp.status_code})"
    try:
        body = resp.json()
    except ValueError:
        return message
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict) and isinstance(err.get("message"), str):
        return err["message"]
    if isinstance(err, str):
        return err
    return message


class AnakinWireBuildToolSchema(BaseModel):
    website_url: str = Field(
        description="The site to build an action for. The domain is extracted automatically."
    )
    goal: str = Field(
        description=(
            "Natural-language description of what the action should do or "
            "extract. Be specific — the builder synthesizes the scraper from this."
        )
    )
    catalog_id: str | None = Field(
        default=None, description="Optional — attach to an existing catalog instead of creating one"
    )
    force: bool = Field(
        default=False,
        description=(
            "Build even if similar actions already exist for the domain "
            "(otherwise the request is rejected with ACTION_EXISTS)"
        ),
    )


class AnakinWireBuildTool(BaseTool):
    """Tool for requesting a brand-new Anakin Wire action for a website
    that isn't in the catalog yet. Describe the site (website_url) and what
    the action should do or extract (goal); Wire generates and auto-tests a
    scraper, then publishes it. Asynchronous (returns status "pending") and
    charges credits, refunded automatically if the build fails. Only use
    this after AnakinWireDiscoverTool / AnakinWireCatalogTool confirm no
    existing action covers the site. Does not build payment or fund-transfer
    actions — such requests are refused. To run this tool, you need an
    Anakin API key — get one free at https://anakin.io/dashboard (300
    credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        visibility (str): Action visibility, "private" or "public". Default:
            "private".
    """

    name: str = "Anakin Wire build tool"
    description: str = (
        "Request a brand-new Wire action for a website not yet in the "
        "catalog — Wire generates, tests, and publishes a scraper from a goal"
    )
    args_schema: type[BaseModel] = AnakinWireBuildToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
    visibility: Literal["private", "public"] = "private"
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
        self.api_key = api_key or os.environ.get("ANAKIN_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Anakin API key not found. Pass api_key or set the ANAKIN_API_KEY "
                "environment variable. Get a free key at https://anakin.io/dashboard."
            )

    def _post(self, path: str, body: dict[str, Any]) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        resp = requests.post(
            f"{self.base_url}{path}", headers=headers, json=body, timeout=REQUEST_TIMEOUT_S
        )
        if not resp.ok:
            raise RuntimeError(_error_message("POST", path, resp))
        return resp.json() if resp.content else {}

    def _run(
        self,
        website_url: str,
        goal: str,
        catalog_id: str | None = None,
        force: bool = False,
    ) -> Any:
        haystack = f"{goal} {website_url}".lower()
        if any(keyword in haystack for keyword in _FINANCIAL_KEYWORDS):
            raise ValueError(
                "Refused: this build request looks like a payment or fund "
                "transfer action. Anakin Wire does not build financial actions."
            )

        body: dict[str, Any] = {
            "website_url": website_url,
            "goal": goal,
            "visibility": self.visibility,
        }
        if catalog_id:
            body["catalog_id"] = catalog_id
        if force:
            body["force"] = force
        return self._post("/wire/build-request", body)
