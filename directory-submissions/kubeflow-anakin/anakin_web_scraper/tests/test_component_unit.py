"""Tests for the anakin_web_scraper component."""

from unittest import mock

from ..component import scrape_url


class TestAnakinWebScraperUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(scrape_url)
        assert hasattr(scrape_url, "python_func")

    @mock.patch("requests.get")
    @mock.patch("requests.post")
    def test_component_polls_until_completed(self, mock_post, mock_get):
        """Test the submit-then-poll flow against a mocked API."""
        mock_post.return_value.json.return_value = {"jobId": "job_123", "status": "pending"}
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_get.return_value.json.return_value = {
            "status": "completed",
            "markdown": "# Hello",
            "durationMs": 100,
            "cached": False,
        }
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/scraped_content"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            scrape_url.python_func(
                url="https://example.com",
                api_key="ask_test_dummy",
                scraped_content=mock_output,
            )
            mock_file().write.assert_called_once_with("# Hello")

        mock_post.assert_called_once()
        mock_get.assert_called_once()
