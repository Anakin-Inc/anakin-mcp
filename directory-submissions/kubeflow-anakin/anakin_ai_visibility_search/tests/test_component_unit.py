"""Tests for the anakin_ai_visibility_search component."""

from unittest import mock

from ..component import search_ai_visibility


class TestAnakinAiVisibilitySearchUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(search_ai_visibility)
        assert hasattr(search_ai_visibility, "python_func")

    @mock.patch("requests.get")
    @mock.patch("requests.post")
    def test_component_submits_and_polls_until_terminal(self, mock_post, mock_get):
        """Test the submit-then-poll flow against a mocked API, and full_content stripping."""
        mock_post.return_value.json.return_value = {"search_id": "vis_123", "status": "running"}
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_get.return_value.json.return_value = {
            "search_id": "vis_123",
            "status": "completed",
            "country": "us",
            "synthesis": "Engines agree on the basics.",
            "results": [{"source": "chatgpt", "summary": "...", "full_content": "very long text"}],
        }
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/visibility_results"

        written = {}

        def fake_dump(obj, fp):
            written["obj"] = obj

        with mock.patch("builtins.open", mock.mock_open()):
            with mock.patch("json.dump", side_effect=fake_dump):
                search_ai_visibility.python_func(
                    query="what is anakin.io",
                    api_key="ask_test_dummy",
                    visibility_results=mock_output,
                )

        mock_post.assert_called_once()
        mock_get.assert_called_once()
        assert "full_content" not in written["obj"]["results"][0]
