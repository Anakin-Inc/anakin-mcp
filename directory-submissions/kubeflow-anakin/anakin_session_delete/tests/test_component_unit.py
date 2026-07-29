"""Tests for the anakin_session_delete component."""

from unittest import mock

from ..component import delete_session


class TestAnakinSessionDeleteUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(delete_session)
        assert hasattr(delete_session, "python_func")

    @mock.patch("anakin.Anakin.sessions", new_callable=mock.PropertyMock)
    def test_component_writes_results(self, mock_sessions_prop):
        """Test the sessions.delete() call and output-artifact write against a mocked SDK."""
        mock_sessions_client = mock.MagicMock()
        mock_sessions_client.delete.return_value = None
        mock_sessions_prop.return_value = mock_sessions_client

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/deletion_status"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            delete_session.python_func(
                session_id="sess_123",
                api_key="ask_test_dummy",
                deletion_status=mock_output,
            )
            mock_file().write.assert_called_once_with('{"session_id": "sess_123", "deleted": true}')

        mock_sessions_client.delete.assert_called_once_with("sess_123")
