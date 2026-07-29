"""Tests for the anakin_monitor_changes component."""

from unittest import mock

from ..component import get_monitor_changes


class TestAnakinMonitorChangesUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(get_monitor_changes)
        assert hasattr(get_monitor_changes, "python_func")

    @mock.patch("requests.get")
    def test_component_fetches_changes_and_writes_results(self, mock_get):
        """Test the GET /monitors/{id}/changes call and output-artifact write."""
        mock_get.return_value.json.return_value = {"changes": [{"detected_at": "2026-07-01T00:00:00Z"}]}
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/changes"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            get_monitor_changes.python_func(
                id="mon_123",
                api_key="ask_test_dummy",
                changes=mock_output,
            )
            mock_file().write.assert_called_once()

        args, _ = mock_get.call_args
        assert args[0].endswith("/monitors/mon_123/changes")
