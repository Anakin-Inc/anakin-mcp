"""Tests for the anakin_wire_read_action component."""

from unittest import mock

from ..component import run_wire_read_action


class TestAnakinWireReadActionUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(run_wire_read_action)
        assert hasattr(run_wire_read_action, "python_func")

    @mock.patch("anakin.Anakin.wire")
    def test_component_writes_results(self, mock_wire):
        """Test the wire() call and output-artifact write against a mocked SDK."""
        from anakin.models import WireResult

        mock_wire.return_value = WireResult(
            job_id="job_123", status="completed", data={"price": "$19.99"}, credits_used=2, execution_ms=800
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/action_result"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            run_wire_read_action.python_func(
                action_id="amazon.get_product",
                api_key="ask_test_dummy",
                action_result=mock_output,
                params_json='{"asin": "B0EXAMPLE"}',
            )
            mock_file().write.assert_called()

        mock_wire.assert_called_once_with("amazon.get_product", {"asin": "B0EXAMPLE"})

    @mock.patch("anakin.Anakin.wire")
    def test_component_raises_actionable_error_on_auth_required(self, mock_wire):
        """Test that an auth failure is turned into an actionable RuntimeError."""
        from anakin.errors import WireAuthRequiredError

        mock_wire.side_effect = WireAuthRequiredError(
            "Authentication required", connect_url="https://anakin.io/connect/amazon"
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/action_result"

        try:
            run_wire_read_action.python_func(
                action_id="amazon.get_orders",
                api_key="ask_test_dummy",
                action_result=mock_output,
            )
            raise AssertionError("expected RuntimeError")
        except RuntimeError as exc:
            assert "https://anakin.io/connect/amazon" in str(exc)
