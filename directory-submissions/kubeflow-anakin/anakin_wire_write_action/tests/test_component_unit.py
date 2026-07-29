"""Tests for the anakin_wire_write_action component."""

from unittest import mock

from ..component import run_wire_write_action


class TestAnakinWireWriteActionUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(run_wire_write_action)
        assert hasattr(run_wire_write_action, "python_func")

    @mock.patch("anakin.Anakin.wire")
    def test_component_writes_results(self, mock_wire):
        """Test the wire() call and output-artifact write against a mocked SDK."""
        from anakin.models import WireResult

        mock_wire.return_value = WireResult(
            job_id="job_456", status="completed", data={"submitted": True}, credits_used=3, execution_ms=1200
        )

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/action_result"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            run_wire_write_action.python_func(
                action_id="contact_form.submit",
                api_key="ask_test_dummy",
                action_result=mock_output,
                params_json='{"message": "hello"}',
            )
            mock_file().write.assert_called()

        mock_wire.assert_called_once_with("contact_form.submit", {"message": "hello"})

    @mock.patch("anakin.Anakin.wire")
    def test_component_blocks_financial_actions(self, mock_wire):
        """Test that a checkout-shaped action is refused before hitting the SDK."""
        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/action_result"

        try:
            run_wire_write_action.python_func(
                action_id="amazon.checkout",
                api_key="ask_test_dummy",
                action_result=mock_output,
                params_json="{}",
            )
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert "financial transactions" in str(exc)

        mock_wire.assert_not_called()
