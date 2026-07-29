"""Tests for the anakin_ai_visibility_sources component."""

from unittest import mock

from ..component import list_ai_visibility_sources


class TestAnakinAiVisibilitySourcesUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(list_ai_visibility_sources)
        assert hasattr(list_ai_visibility_sources, "python_func")

    @mock.patch("requests.get")
    def test_component_fetches_sources_and_writes_results(self, mock_get):
        """Test the GET /ai-visibility/sources call and output-artifact write."""
        mock_get.return_value.json.return_value = {"sources": [{"slug": "chatgpt", "label": "ChatGPT"}]}
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/visibility_sources"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            list_ai_visibility_sources.python_func(
                api_key="ask_test_dummy",
                visibility_sources=mock_output,
            )
            mock_file().write.assert_called_once()

        args, _ = mock_get.call_args
        assert args[0].endswith("/ai-visibility/sources")
