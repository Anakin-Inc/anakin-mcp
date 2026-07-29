"""Tests for the anakin_agentic_search component."""

from unittest import mock

from ..component import agentic_search


class TestAnakinAgenticSearchUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(agentic_search)
        assert hasattr(agentic_search, "python_func")

    @mock.patch("anakin.Anakin.agentic_search")
    def test_component_writes_results(self, mock_agentic_search):
        """Test the agentic-search call and output-artifact write against a mocked SDK."""
        from anakin.models import AgenticSearchData, AgenticSearchResult

        mock_agentic_search.return_value = AgenticSearchResult(
            id="agentic_123",
            status="completed",
            generated_json=AgenticSearchData(summary="Summary text"),
            cached=False,
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/research_result"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            agentic_search.python_func(
                prompt="compare EU and US data privacy law",
                api_key="ask_test_dummy",
                research_result=mock_output,
            )
            mock_file().write.assert_called()

        mock_agentic_search.assert_called_once_with(
            "compare EU and US data privacy law", use_browser=True, schema=None
        )
