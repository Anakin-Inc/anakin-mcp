"""Tests for the anakin_session_list component."""

from unittest import mock

from ..component import list_sessions


class TestAnakinSessionListUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(list_sessions)
        assert hasattr(list_sessions, "python_func")

    @mock.patch("anakin.Anakin.sessions", new_callable=mock.PropertyMock)
    def test_component_writes_results(self, mock_sessions_prop):
        """Test the sessions.list() call and output-artifact write against a mocked SDK."""
        from anakin.models import BrowserSession

        mock_sessions_client = mock.MagicMock()
        mock_sessions_client.list.return_value = [
            BrowserSession(sessionId="sess_123", name="Amazon login", websiteDomain="amazon.com")
        ]
        mock_sessions_prop.return_value = mock_sessions_client

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/sessions"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            list_sessions.python_func(
                api_key="ask_test_dummy",
                sessions=mock_output,
            )
            mock_file().write.assert_called()
