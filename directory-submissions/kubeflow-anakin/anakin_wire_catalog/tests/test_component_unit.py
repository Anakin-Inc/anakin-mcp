"""Tests for the anakin_wire_catalog component."""

from unittest import mock

from ..component import get_wire_catalog


class TestAnakinWireCatalogUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(get_wire_catalog)
        assert hasattr(get_wire_catalog, "python_func")

    @mock.patch("requests.get")
    def test_component_fetches_single_catalog(self, mock_get):
        """Test that a slug routes to /wire/catalog/{slug} and writes the result."""
        mock_get.return_value.json.return_value = {"slug": "walmart", "actions": []}
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_catalog"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            get_wire_catalog.python_func(
                api_key="ask_test_dummy",
                wire_catalog=mock_output,
                slug="walmart",
            )
            mock_file().write.assert_called_once()

        mock_get.assert_called_once()
        args, _ = mock_get.call_args
        assert args[0].endswith("/wire/catalog/walmart")
