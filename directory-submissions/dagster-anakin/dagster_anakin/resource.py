from collections.abc import Generator
from contextlib import contextmanager

from anakin import Anakin
from dagster import ConfigurableResource, InitResourceContext
from dagster._annotations import public
from pydantic import Field, PrivateAttr


class AnakinResource(ConfigurableResource):
    """This resource is a wrapper over the `Anakin library <https://github.com/Anakin-Inc/anakin-py>`_.

    Anakin turns any website into clean markdown or AI-extracted structured
    JSON — web scraping, crawling, AI search, and multi-stage agentic
    research over hundreds of popular sites.

    Examples:
        .. code-block:: python

            from dagster import AssetExecutionContext, Definitions, EnvVar, asset
            from dagster_anakin import AnakinResource


            @asset(compute_kind="anakin")
            def scraped_page(context: AssetExecutionContext, anakin: AnakinResource):
                with anakin.get_client() as client:
                    doc = client.scrape("https://example.com")
                    return doc.markdown

            defs = Definitions(
                assets=[scraped_page],
                resources={
                    "anakin": AnakinResource(api_key=EnvVar("ANAKIN_API_KEY")),
                },
            )

    """

    api_key: str = Field(
        description=(
            "Anakin API key. Get a free key at https://anakin.io/dashboard "
            "(300 credits, no card required)."
        )
    )
    base_url: str = Field(default=None)

    _client: Anakin = PrivateAttr()

    @classmethod
    def _is_dagster_maintained(cls) -> bool:
        return False

    def setup_for_execution(self, context: InitResourceContext) -> None:
        kwargs = {"api_key": self.api_key}
        if self.base_url:
            kwargs["base_url"] = self.base_url
        self._client = Anakin(**kwargs)

    @public
    @contextmanager
    def get_client(self) -> Generator[Anakin, None, None]:
        """Yields an ``anakin.Anakin`` client for interacting with the Anakin API."""
        yield self._client

    def teardown_after_execution(self, context: InitResourceContext) -> None:
        self._client.close()
