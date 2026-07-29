from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinSearchToolSchema(BaseModel):
    query: str = Field(description="Search query or question")


class AnakinSearchTool(BaseTool):
    """Tool for AI-powered web search using the Anakin API. Synchronous — returns
    immediately, no polling. To run this tool, you need an Anakin API key — get
    one free at https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        limit (int): Maximum number of results to return. Default: 5.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin AI search tool"
    description: str = "Search the web using Anakin's AI-powered search and return structured results"
    args_schema: type[BaseModel] = AnakinSearchToolSchema
    api_key: str | None = None
    limit: int = 5

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

    def _run(self, query: str) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        result = self._client.search(query, limit=self.limit)
        return [r.model_dump() for r in result.results]


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinSearchTool, "_model_rebuilt", False):
        AnakinSearchTool.model_rebuild()
        AnakinSearchTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
