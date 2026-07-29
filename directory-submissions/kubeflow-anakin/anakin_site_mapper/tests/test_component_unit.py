"""Tests for the anakin_site_mapper component."""

from unittest import mock

from ..component import map_site


class TestAnakinSiteMapperUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(map_site)
        assert hasattr(map_site, "python_func")

    @mock.patch("anakin.Anakin.map")
    def test_component_writes_results(self, mock_map):
        """Test the map call and output-artifact write against a mocked SDK."""
        from anakin.models import MapResult

        mock_map.return_value = MapResult(
            id="map_123",
            url="https://example.com",
            links=["https://example.com/a"],
            totalLinks=1,
            externalLinks=[],
            totalExternalLinks=0,
            durationMs=50,
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/site_map"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            map_site.python_func(
                url="https://example.com",
                api_key="ask_test_dummy",
                site_map=mock_output,
            )
            mock_file().write.assert_called()

        mock_map.assert_called_once()
