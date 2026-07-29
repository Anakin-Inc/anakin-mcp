from __future__ import annotations

from typing import Any

from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr


try:
    from anakin import Anakin  # type: ignore[import-untyped]

    ANAKIN_AVAILABLE = True
except ImportError:
    ANAKIN_AVAILABLE = False


class AnakinMapToolSchema(BaseModel):
    url: str = Field(
        description="Starting URL for link discovery (typically a homepage or section root)"
    )


class AnakinMapTool(BaseTool):
    """Tool for discovering all reachable URLs under a website using the Anakin API.
    Useful for scoping a crawl or finding sub-pages an agent should scrape. To run
    this tool, you need an Anakin API key — get one free at
    https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        limit (int): Maximum number of URLs to return overall. Default: 100.
        depth (int): How many link-hops from the starting URL to follow. Default: 2.
        limit_per_level (int): Maximum URLs collected per depth level (controls
            breadth). Default: 100.
        include_subdomains (bool): Include URLs on subdomains of the starting host.
            Default: False.
        include_external_links (bool): Also collect (but do not follow) external
            links. Default: False.
        use_browser (bool): Render with a headless browser — best for
            JavaScript-heavy single-page apps. Default: False.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True, validate_assignment=True, frozen=False
    )
    name: str = "Anakin site map tool"
    description: str = (
        "Discover all reachable URLs under a website using Anakin and return "
        "internal links, external links, and counts"
    )
    args_schema: type[BaseModel] = AnakinMapToolSchema
    api_key: str | None = None
    limit: int = 100
    depth: int = 2
    limit_per_level: int = 100
    include_subdomains: bool = False
    include_external_links: bool = False
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

        result = self._client.map(
            url,
            limit=self.limit,
            depth=self.depth,
            limit_per_level=self.limit_per_level,
            include_subdomains=self.include_subdomains,
            include_external_links=self.include_external_links,
            use_browser=self.use_browser,
        )
        return result.model_dump()


try:
    from anakin import Anakin  # noqa: F401

    if not getattr(AnakinMapTool, "_model_rebuilt", False):
        AnakinMapTool.model_rebuild()
        AnakinMapTool._model_rebuilt = True  # type: ignore[attr-defined]
except ImportError:
    pass
