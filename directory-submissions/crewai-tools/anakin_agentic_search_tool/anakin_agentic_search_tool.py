from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinAgenticSearchToolSchema(BaseModel):
    prompt: str = Field(description="The research question or task in natural language")


class AnakinAgenticSearchTool(BaseTool):
    """Tool for multi-source deep research using the Anakin API. The pipeline
    searches the web, scrapes the most relevant citations, and uses an LLM to
    structure the combined data into a unified answer. Use this when one URL or
    a flat search result will not answer the question (comparative analysis,
    multi-jurisdictional research, market intelligence). Slower and more
    expensive than AnakinSearchTool — typically 1-5 minutes and 10 credits per
    call. To run this tool, you need an Anakin API key — get one free at
    https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        use_browser (bool): Use the headless browser when scraping cited pages
            — more reliable for JavaScript-heavy sources. Default: True.
        output_schema (dict): Optional JSON Schema describing the desired
            structured_data shape. If omitted, the engine infers a schema from
            the prompt.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin agentic search tool"
    description: str = (
        "Run multi-stage AI research with Anakin: search the web, scrape the "
        "most relevant citations, and return a summary plus structured data"
    )
    args_schema: type[BaseModel] = AnakinAgenticSearchToolSchema
    api_key: str | None = None
    use_browser: bool = True
    output_schema: dict[str, Any] | None = None

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

    def _run(self, prompt: str) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        result = self._client.agentic_search(
            prompt,
            use_browser=self.use_browser,
            schema=self.output_schema,
        )
        return result.model_dump()


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinAgenticSearchTool, "_model_rebuilt", False):
        AnakinAgenticSearchTool.model_rebuild()
        AnakinAgenticSearchTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
