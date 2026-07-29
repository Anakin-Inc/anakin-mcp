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


class AnakinWireLoginToolSchema(BaseModel):
    catalog_slug: str = Field(description='The catalog to sign in to (e.g. "neb")')
    params: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Login fields defined by the catalog (e.g. email/password). Use "
            "AnakinWireCatalogTool's login_input_schema to learn the field names."
        ),
    )
    identity_name: str | None = Field(
        default=None,
        description="Optional name for the identity. Derived from params in password mode.",
    )


class AnakinWireLoginTool(BaseTool):
    """Tool for signing in to a credentials-mode Anakin Wire site and getting
    a credential_id usable immediately with AnakinWireReadActionTool /
    AnakinWireWriteActionTool. Provide the catalog slug and login params (the
    fields that catalog's login schema defines, e.g. email/password — see
    AnakinWireCatalogTool's login_input_schema). The password is never
    stored, only the encrypted session. Only needed for actions whose
    auth_mode is "required", and only for catalogs that support password
    sign-in; cookie-based sites use the dashboard connect flow instead.
    Establishes and stores an encrypted session — this is a side effect, not
    a read-only operation. To run this tool, you need an Anakin API key —
    get one free at https://anakin.io/dashboard (300 credits, no card
    required).

    Args:
        api_key (str): Your Anakin API key.
    """

    name: str = "Anakin Wire login tool"
    description: str = (
        "Sign in to a credentials-mode Wire site and get a credential_id "
        "usable with Wire read/write action tools. Stores an encrypted session."
    )
    args_schema: type[BaseModel] = AnakinWireLoginToolSchema
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
        catalog_slug: str,
        params: dict[str, Any] | None = None,
        identity_name: str | None = None,
    ) -> Any:
        body: dict[str, Any] = {"catalog_slug": catalog_slug}
        if params:
            body["params"] = params
        if identity_name:
            body["identity_name"] = identity_name
        return self._post("/wire/login", body)
