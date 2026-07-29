from __future__ import annotations

import os
from typing import Any

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


class AnakinWireIdentitiesToolSchema(BaseModel):
    catalog_id: str | None = Field(
        default=None, description="Optional — restrict to identities for a single catalog"
    )


class AnakinWireIdentitiesTool(BaseTool):
    """Tool for listing your saved Anakin Wire identities and their
    credentials. An identity is a named account on a site; each credential's
    id is the credential_id a Wire action needs when its auth_mode is
    "required". Optionally filter by catalog_id. Use this to find an existing
    credential before running an auth-required action (and check its status
    is "active", not "expired"). To run this tool, you need an Anakin API
    key — get one free at https://anakin.io/dashboard (300 credits, no card
    required).

    Args:
        api_key (str): Your Anakin API key.
    """

    name: str = "Anakin Wire identities tool"
    description: str = (
        "List saved Anakin Wire identities and their credentials, "
        "optionally filtered by catalog_id"
    )
    args_schema: type[BaseModel] = AnakinWireIdentitiesToolSchema
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

    def _run(self, catalog_id: str | None = None) -> Any:
        params = {"catalog_id": catalog_id} if catalog_id else None
        return self._get("/wire/identities", params=params)
