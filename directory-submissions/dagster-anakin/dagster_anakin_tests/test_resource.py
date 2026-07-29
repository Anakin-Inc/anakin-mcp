from unittest.mock import MagicMock, patch

from dagster import asset, materialize
from dagster_anakin import AnakinResource


def test_get_client():
    with patch("dagster_anakin.resource.Anakin") as mock_anakin_cls:
        mock_client = MagicMock()
        mock_client.scrape.return_value.markdown = "# Hello"
        mock_anakin_cls.return_value = mock_client

        @asset
        def scraped_page(anakin: AnakinResource):
            with anakin.get_client() as client:
                return client.scrape("https://example.com").markdown

        result = materialize(
            [scraped_page],
            resources={"anakin": AnakinResource(api_key="ask_test_dummy")},
        )

        assert result.success
        mock_anakin_cls.assert_called_once_with(api_key="ask_test_dummy")
        mock_client.scrape.assert_called_once_with("https://example.com")
