from __future__ import annotations

import os
from typing import Any

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30


def _error_message(method: str, path: str, resp: requests.Response) -> str:
    """Mirror anakin-mcp's AnakinError parsing: a nested {error: {message,
    code}} envelope, or the legacy flat {error: "msg"} shape."""
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


class AnakinWireDiscoverToolSchema(BaseModel):
    q: str = Field(
        description=(
            'The intent in natural language, e.g. "top phones on walmart", '
            '"search airbnb listings in Lisbon", "a linkedin profile\'s work history"'
        )
    )
    limit: int | None = Field(
        default=None, description="Maximum number of candidate actions to return"
    )


class AnakinWireDiscoverTool(BaseTool):
    """Tool for finding Wire actions for a task from a natural-language
    intent, using the Anakin API. Wire is a catalog of pre-built automation
    actions across hundreds of websites (Amazon, Walmart, LinkedIn, Airbnb,
    Zillow, and others). Actions are of two kinds: READ actions that extract
    data and WRITE actions that perform interactions. Many read actions need
    no authentication. Returns ranked candidate actions, each with its
    action_id, type ("read" or "write"), required/optional params, credit
    cost, and whether auth is needed. Run a returned action with
    AnakinWireReadActionTool or AnakinWireWriteActionTool depending on its
    type. To run this tool, you need an Anakin API key — get one free at
    https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        limit (int): Default maximum number of candidate actions to return
            when not overridden per call. Default: 5.
    """

    name: str = "Anakin Wire discover tool"
    description: str = (
        "Find Wire actions for a task from a natural-language intent, "
        "returning ranked candidate action_ids with their type, params, and cost"
    )
    args_schema: type[BaseModel] = AnakinWireDiscoverToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
    limit: int = 5
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

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        resp = requests.get(
            f"{self.base_url}{path}",
            headers=headers,
            params=params,
            timeout=REQUEST_TIMEOUT_S,
        )
        if not resp.ok:
            raise RuntimeError(_error_message("GET", path, resp))
        return resp.json() if resp.content else {}

    def _run(self, q: str, limit: int | None = None) -> Any:
        params: dict[str, Any] = {"q": q, "limit": limit if limit is not None else self.limit}
        return self._get("/wire/resolve", params=params)
