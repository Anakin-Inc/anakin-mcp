from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30


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


class AnakinWireCatalogToolSchema(BaseModel):
    slug: str | None = Field(
        default=None,
        description='Catalog slug to inspect (e.g. "walmart"). Omit to list all catalogs.',
    )


class AnakinWireCatalogTool(BaseTool):
    """Tool for browsing the Anakin Wire catalog. With no arguments, lists
    every supported website and its action count. Pass a catalog slug (e.g.
    "walmart", "amazon", "linkedin") to get that site's full action list with
    exact parameter schemas, each action's type (read/write), auth mode
    (none/optional/required), and credit cost — plus the login fields for
    credentials-mode sites. Use this to see everything a specific site can do
    before running an action with AnakinWireReadActionTool or
    AnakinWireWriteActionTool. To run this tool, you need an Anakin API key —
    get one free at https://anakin.io/dashboard (300 credits, no card
    required).

    Args:
        api_key (str): Your Anakin API key.
    """

    name: str = "Anakin Wire catalog tool"
    description: str = (
        "Browse the Anakin Wire catalog: list every supported website, or "
        "get one site's full action list with parameter schemas and auth mode"
    )
    args_schema: type[BaseModel] = AnakinWireCatalogToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
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

    def _get(self, path: str) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        resp = requests.get(f"{self.base_url}{path}", headers=headers, timeout=REQUEST_TIMEOUT_S)
        if not resp.ok:
            raise RuntimeError(_error_message("GET", path, resp))
        return resp.json() if resp.content else {}

    def _run(self, slug: str | None = None) -> Any:
        path = f"/wire/catalog/{quote(slug)}" if slug else "/wire/catalog"
        return self._get(path)
