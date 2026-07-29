"""Tests for the anakin_wire_build component."""

from unittest import mock

from ..component import request_wire_build


class TestAnakinWireBuildUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(request_wire_build)
        assert hasattr(request_wire_build, "python_func")

    @mock.patch("requests.post")
    def test_component_posts_build_request_and_writes_status(self, mock_post):
        """Test the POST /wire/build-request call and output-artifact write against a mocked API."""
        mock_post.return_value.json.return_value = {"status": "pending", "build_id": "build_123"}
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_build_status"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            request_wire_build.python_func(
                website_url="https://newsite.example.com",
                goal="extract product prices and stock status",
                api_key="ask_test_dummy",
                wire_build_status=mock_output,
            )
            mock_file().write.assert_called_once()

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0].endswith("/wire/build-request")
        assert kwargs["json"]["website_url"] == "https://newsite.example.com"

    def test_component_blocks_financial_goals(self):
        """Test that a checkout-shaped build goal is refused before any network call."""
        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_build_status"

        try:
            request_wire_build.python_func(
                website_url="https://shop.example.com",
                goal="complete checkout and place order automatically",
                api_key="ask_test_dummy",
                wire_build_status=mock_output,
            )
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert "financial" in str(exc)
