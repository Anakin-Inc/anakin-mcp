from importlib.metadata import version

import dagster_anakin


def test_version():
    assert version("dagster-anakin") == dagster_anakin.__version__
