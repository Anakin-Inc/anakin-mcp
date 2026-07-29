"""Tests for the anakin_web_search component."""

from unittest import mock

from ..component import search_web


class TestAnakinWebSearchUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(search_web)
        assert hasattr(search_web, "python_func")

    @mock.patch("anakin.Anakin.search")
    def test_component_writes_results(self, mock_search):
        """Test the search call and output-artifact write against a mocked SDK."""
        from anakin.models import SearchResult, SearchResultItem

        mock_search.return_value = SearchResult(
            id="search_123",
            results=[SearchResultItem(url="https://example.com", title="Example")],
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/search_results"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            search_web.python_func(
                prompt="anakin web scraping",
                api_key="ask_test_dummy",
                search_results=mock_output,
            )
            mock_file().write.assert_called()

        mock_search.assert_called_once_with("anakin web scraping", limit=5)
