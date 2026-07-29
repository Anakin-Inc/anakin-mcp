"""Tests for the anakin_wire_discover component."""

from unittest import mock

from ..component import discover_wire_actions


class TestAnakinWireDiscoverUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(discover_wire_actions)
        assert hasattr(discover_wire_actions, "python_func")

    @mock.patch("requests.get")
    def test_component_calls_resolve_and_writes_results(self, mock_get):
        """Test the GET /wire/resolve call and output-artifact write against a mocked API."""
        mock_get.return_value.json.return_value = {
            "results": [{"action_id": "walmart.search_products", "type": "read"}]
        }
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_actions"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            discover_wire_actions.python_func(
                q="top phones on walmart",
                api_key="ask_test_dummy",
                wire_actions=mock_output,
            )
            mock_file().write.assert_called_once()

        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert args[0].endswith("/wire/resolve")
        assert kwargs["params"] == {"q": "top phones on walmart", "limit": 5}
