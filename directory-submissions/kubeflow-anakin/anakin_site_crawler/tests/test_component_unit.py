"""Tests for the anakin_site_crawler component."""

from unittest import mock

from ..component import crawl_site


class TestAnakinSiteCrawlerUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(crawl_site)
        assert hasattr(crawl_site, "python_func")

    @mock.patch("anakin.Anakin.crawl")
    def test_component_writes_results(self, mock_crawl):
        """Test the crawl call and output-artifact write against a mocked SDK."""
        from anakin.models import CrawlPage, CrawlResult

        mock_crawl.return_value = CrawlResult(
            id="crawl_123",
            url="https://example.com",
            totalPages=1,
            completedPages=1,
            results=[CrawlPage(url="https://example.com", status="completed", markdown="# Hi")],
            durationMs=200,
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/crawled_pages"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            crawl_site.python_func(
                url="https://example.com",
                api_key="ask_test_dummy",
                crawled_pages=mock_output,
            )
            mock_file().write.assert_called()

        mock_crawl.assert_called_once()
