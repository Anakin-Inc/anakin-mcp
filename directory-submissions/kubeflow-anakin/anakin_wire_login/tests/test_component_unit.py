"""Tests for the anakin_wire_login component."""

from unittest import mock

from ..component import wire_login


class TestAnakinWireLoginUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(wire_login)
        assert hasattr(wire_login, "python_func")

    @mock.patch("requests.post")
    def test_component_posts_login_and_writes_credential(self, mock_post):
        """Test the POST /wire/login call and output-artifact write against a mocked API."""
        mock_post.return_value.json.return_value = {"credential_id": "cred_123", "status": "active"}
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/wire_credential"

        with mock.patch("builtins.open", mock.mock_open()) as mock_file:
            wire_login.python_func(
                catalog_slug="neb",
                api_key="ask_test_dummy",
                wire_credential=mock_output,
                params_json='{"email": "user@example.com", "password": "hunter2"}',
            )
            mock_file().write.assert_called_once()

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0].endswith("/wire/login")
        assert kwargs["json"]["catalog_slug"] == "neb"
        assert kwargs["json"]["params"]["email"] == "user@example.com"
