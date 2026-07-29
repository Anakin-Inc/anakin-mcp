"""Tests for the anakin_wire_identities component."""

from unittest import mock

from ..component import list_wire_identities


class TestAnakinWireIdentitiesUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(list_wire_identities)
        assert hasattr(list_wire_identities, "python_func")

    @mock.patch("requests.get")
    def test_component_calls_identities_and_writes_results(self, mock_get):
        """Test the GET /wire/identities call and output-artifact write against a mocked API."""
        mock_get.return_value.json.return_value = {"identities": []}
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_identities"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            list_wire_identities.python_func(
                api_key="ask_test_dummy",
                wire_identities=mock_output,
            )
            mock_file().write.assert_called_once()

        mock_get.assert_called_once()
        args, _ = mock_get.call_args
        assert args[0].endswith("/wire/identities")
