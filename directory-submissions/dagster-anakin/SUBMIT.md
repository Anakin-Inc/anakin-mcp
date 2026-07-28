# Dagster — submission instructions

Real, self-serve, PR-buildable — `dagster-io/community-integrations`
(distinct from the core `python_modules/libraries` path, which is reserved
for Dagster Labs-maintained libraries). Cleanest target in the whole
data-orchestration research batch.

## What's here

Mirrors the real `libraries/_template` scaffold structure exactly, using
`libraries/dagster-anthropic` (a comparable thin-API-wrapper resource, not
the heavier connector-style integrations) as the pattern reference — pulled
both live via `gh api`, not assumed:

```
dagster_anakin/__init__.py       DagsterLibraryRegistry.register(...)
dagster_anakin/resource.py       AnakinResource(ConfigurableResource)
dagster_anakin_tests/test_version.py
dagster_anakin_tests/test_resource.py
pyproject.toml, README.md, Makefile
```

`AnakinResource` wraps the official `anakin-sdk` client directly (same
"reuse the SDK" choice as `langchain-anakin` and the CrewAI tools) — a
`get_client()` context manager yielding a real `anakin.Anakin` instance,
deliberately without Anthropic's usage-metadata-logging machinery (that's
LLM-token-specific, doesn't apply here).

## Verified, not assumed

- `python3 -m py_compile` passes on all four Python files.
- `test_resource.py` mocks `Anakin` and actually exercises the real Dagster
  `@asset`/`materialize` machinery (not just a unit test in isolation) —
  but never run, since `pip install dagster` hung in this sandbox (the
  same network restriction hit everywhere else Python packaging was
  needed this session).
- Structure (Makefile targets, `pyproject.toml` shape,
  `DagsterLibraryRegistry.register` call, `_is_dagster_maintained`
  classmethod) copied from the real, current `_template` and
  `dagster-anthropic` sources, not guessed.

## Steps (needs the account owner)

1. Fork `dagster-io/community-integrations`, add this directory as
   `libraries/dagster-anakin/`.
2. `make install && make test && make check` — never run here, needs `uv`
   + working network.
3. Open a PR per the repo's contribution guide.

## Not done

Never installed or run — verified by close reading against real reference
source and `py_compile` only.
