"""Tests for the anakin_monitor_create component."""

from unittest import mock

from ..component import create_monitor


class TestAnakinMonitorCreateUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(create_monitor)
        assert hasattr(create_monitor, "python_func")

    @mock.patch("requests.post")
    def test_component_posts_monitor_and_redacts_secret(self, mock_post):
        """Test the POST /monitors call, secret redaction, and output-artifact write."""
        mock_post.return_value.json.return_value = {
            "id": "mon_123",
            "url": "https://example.com",
            "alertWebhookSecret": "whsec_super_secret",
        }
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/monitor"

        written = {}

        def fake_dump(obj, fp):
            written["obj"] = obj

        with mock.patch("builtins.open", mock.mock_open()):
            with mock.patch("json.dump", side_effect=fake_dump):
                create_monitor.python_func(
                    url="https://example.com",
                    interval_minutes=30,
                    api_key="ask_test_dummy",
                    monitor=mock_output,
                )

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0].endswith("/monitors")
        assert kwargs["json"]["intervalMinutes"] == 30
        assert written["obj"]["alertWebhookSecret"] == "[redacted -- view in the Anakin dashboard]"
