"""Tests for the anakin_browser_task component."""

from unittest import mock

from ..component import run_browser_task


class TestAnakinBrowserTaskUnitTests:
    """Unit tests for component logic."""

    def test_component_function_exists(self):
        """Test that the component function is properly imported."""
        assert callable(run_browser_task)
        assert hasattr(run_browser_task, "python_func")

    @mock.patch("requests.get")
    @mock.patch("requests.post")
    def test_component_submits_and_polls_until_completed(self, mock_post, mock_get):
        """Test the async submit-then-poll flow against a mocked API."""
        mock_post.return_value.json.return_value = {"workflow_id": "wf_123", "status": "accepted"}
        mock_post.return_value.raise_for_status = mock.MagicMock()

        mock_get.return_value.json.return_value = {
            "status": "completed",
            "result": {"success": True, "result": {"price": "$999"}, "run_id": "run_1", "steps": [1, 2, 3]},
        }
        mock_get.return_value.raise_for_status = mock.MagicMock()

        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/task_result"

        written = {}

        def fake_dump(obj, fp):
            written["obj"] = obj

        with mock.patch("builtins.open", mock.mock_open()):
            with mock.patch("json.dump", side_effect=fake_dump):
                run_browser_task.python_func(
                    prompt="find the cheapest 65-inch TV and list its specs",
                    api_key="ask_test_dummy",
                    task_result=mock_output,
                )

        mock_post.assert_called_once()
        mock_get.assert_called_once()
        assert written["obj"]["steps_taken"] == 3
        assert written["obj"]["run_id"] == "run_1"

    def test_component_blocks_financial_prompts(self):
        """Test that a checkout-shaped prompt is refused before any network call."""
        mock_output = mock.MagicMock()
        mock_output.path = "/tmp/task_result"

        try:
            run_browser_task.python_func(
                prompt="buy now and complete checkout with saved card",
                api_key="ask_test_dummy",
                task_result=mock_output,
            )
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert "financial transactions" in str(exc)
