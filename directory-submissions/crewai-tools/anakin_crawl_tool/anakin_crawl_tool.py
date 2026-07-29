from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinCrawlToolSchema(BaseModel):
    url: str = Field(description="Starting URL to crawl")


class AnakinCrawlTool(BaseTool):
    """Tool for bulk-fetching markdown across a site using the Anakin API. Use
    this when an agent needs the contents of many pages at once (catalog
    ingestion, site-wide RAG corpus). To run this tool, you need an Anakin API
    key — get one free at https://anakin.io/dashboard (300 credits, no card
    required).

    Args:
        api_key (str): Your Anakin API key.
        max_pages (int): Hard cap on pages fetched. Default: 10.
        depth (int): Link-hops from the starting URL to follow. Default: 1.
        country (str): Two-letter proxy egress country code. Default: "us".
        use_browser (bool): Render each page in a headless browser — best for
            JavaScript-heavy sites. Default: False.
        include_patterns (list[str]): Glob/regex patterns; only URLs matching at
            least one pattern are fetched. Default: none (fetch everything within
            max_pages/depth).
        exclude_patterns (list[str]): Glob/regex patterns; URLs matching any
            pattern are skipped. Default: none.
        session_id (str): Optional saved-browser-session ID for login-protected
            sites.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin web crawl tool"
    description: str = (
        "Crawl a website using Anakin and return markdown content for every "
        "page reached, scoped by max pages, depth, and include/exclude patterns"
    )
    args_schema: type[BaseModel] = AnakinCrawlToolSchema
    api_key: str | None = None
    max_pages: int = 10
    depth: int = 1
    country: str = "us"
    use_browser: bool = False
    include_patterns: list[str] = Field(default_factory=list)
    exclude_patterns: list[str] = Field(default_factory=list)
    session_id: str | None = None

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

        result = self._client.crawl(
            url,
            max_pages=self.max_pages,
            depth=self.depth,
            country=self.country,
            use_browser=self.use_browser,
            include_patterns=self.include_patterns,
            exclude_patterns=self.exclude_patterns,
            session_id=self.session_id,
        )
        return result.model_dump()


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinCrawlTool, "_model_rebuilt", False):
        AnakinCrawlTool.model_rebuild()
        AnakinCrawlTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
