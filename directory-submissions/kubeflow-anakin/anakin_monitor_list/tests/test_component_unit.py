"""Tests for the anakin_monitor_list component."""

from unittest import mock

from ..component import list_monitors


class TestAnakinMonitorListUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(list_monitors)
        assert hasattr(list_monitors, "python_func")

    @mock.patch("requests.get")
    def test_component_fetches_one_monitor_by_id_and_redacts_secret(self, mock_get):
        """Test that an id routes to /monitors/{id}, redacts secrets, and writes the result."""
        mock_get.return_value.json.return_value = {
            "id": "mon_123",
            "alertWebhookSecret": "whsec_super_secret",
        }
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/monitors"

        written = {}

        def fake_dump(obj, fp):
            written["obj"] = obj

        with mock.patch("builtins.open", mock.mock_open()):
            with mock.patch("json.dump", side_effect=fake_dump):
                list_monitors.python_func(
                    api_key="ask_test_dummy",
                    monitors=mock_output,
                    id="mon_123",
                )

        args, _ = mock_get.call_args
        assert args[0].endswith("/monitors/mon_123")
        assert written["obj"]["alertWebhookSecret"] == "[redacted -- view in the Anakin dashboard]"
