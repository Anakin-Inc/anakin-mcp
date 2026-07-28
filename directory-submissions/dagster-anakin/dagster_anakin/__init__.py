from dagster._core.libraries import DagsterLibraryRegistry

from dagster_anakin.resource import AnakinResource as AnakinResource

__version__ = "0.0.1"

DagsterLibraryRegistry.register(
    "dagster-anakin", __version__, is_dagster_package=False
)
