from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinScrapeToolSchema(BaseModel):
    url: str = Field(description="Website URL to scrape")


class AnakinScrapeTool(BaseTool):
    """Tool for scraping webpages using the Anakin API. To run this tool, you need
    an Anakin API key — get one free at https://anakin.io/dashboard (300 credits,
    no card required).

    Args:
        api_key (str): Your Anakin API key.
        generate_json (bool): AI-extract structured JSON from the page content. Default: False.
        use_browser (bool): Use a headless browser — best for JS-heavy sites. Default: False.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin web scrape tool"
    description: str = "Scrape a webpage using Anakin and return clean markdown or AI-extracted JSON"
    args_schema: type[BaseModel] = AnakinScrapeToolSchema
    api_key: str | None = None
    generate_json: bool = False
    use_browser: bool = False

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

    def _run(self, url: str) -> Any:
        if not self._client:
            raise RuntimeError("Anakin client not properly initialized")

        doc = self._client.scrape(
            url,
            generate_json=self.generate_json,
            use_browser=self.use_browser,
        )
        return doc.markdown or doc.generated_json or doc.summary


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinScrapeTool, "_model_rebuilt", False):
        AnakinScrapeTool.model_rebuild()
        AnakinScrapeTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
