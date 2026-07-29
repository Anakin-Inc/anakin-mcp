"""Tests for the anakin_monitor_control component."""

from unittest import mock

from ..component import control_monitor


class TestAnakinMonitorControlUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(control_monitor)
        assert hasattr(control_monitor, "python_func")

    @mock.patch("requests.request")
    def test_component_pauses_monitor(self, mock_request):
        """Test that action="pause" issues a POST to the /pause endpoint."""
        mock_request.return_value.json.return_value = {"id": "mon_123", "isActive": False}
        mock_request.return_value.raise_for_status = mock.MagicMock()
        mock_request.return_value.content = b"{}"

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/monitor_status"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            control_monitor.python_func(
                id="mon_123",
                action="pause",
                api_key="ask_test_dummy",
                monitor_status=mock_output,
            )
            mock_file().write.assert_called_once()

        method, url = mock_request.call_args[0]
        assert method == "POST"
        assert url.endswith("/monitors/mon_123/pause")

    def test_component_rejects_unknown_action(self):
        """Test that an invalid action raises before any network call."""
        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/monitor_status"

        try:
            control_monitor.python_func(
                id="mon_123",
                action="destroy",
                api_key="ask_test_dummy",
                monitor_status=mock_output,
            )
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert "Unknown monitor action" in str(exc)
