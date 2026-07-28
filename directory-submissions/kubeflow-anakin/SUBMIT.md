# Kubeflow — submission instructions

Real, PR-buildable component registry —
`kubeflow/pipelines-components`, distinct from arbitrary per-pipeline
components (any Kubeflow user can already call Anakin's API from a plain
`@dsl.component` with zero registry involvement; this repo exists purely
for discoverability/reuse of common ones).

## What's here

Mirrors the real `components/data_processing/yoda_data_processor/` example
(pulled live via `gh api`) structure exactly:

```
anakin_web_scraper/__init__.py
anakin_web_scraper/component.py       @dsl.component wrapping the scrape submit+poll flow
anakin_web_scraper/metadata.yaml
anakin_web_scraper/README.md
anakin_web_scraper/OWNERS             needs the submitting account's GitHub handle
anakin_web_scraper/tests/test_component_unit.py
```

`packages_to_install=["requests"]` rather than `anakin-sdk` — KFP components
run in their own isolated container, and `anakin-sdk` isn't published to
PyPI yet (same gap noted for `langchain-anakin` and the CrewAI tools
elsewhere in this session), so this one talks to the API directly via
`requests` rather than depending on an unpublished package.

## Verified, not assumed

- `python3 -m py_compile` passes on `component.py` and the test file.
- Component/metadata/README/OWNERS/tests structure copied from the real,
  current `yoda_data_processor` example, not guessed.
- **Could not actually run the test** — it imports `scrape_url` from
  `component.py`, which imports `kfp`; `pip install kfp` wasn't attempted
  given the network restriction hit by every other Python package this
  session (confirmed separately for `crewai`, `dagster`, `langchain-core`).
  The mocked test logic was reviewed by hand instead (submit → poll loop →
  write markdown to the output artifact path), not executed.

## Steps (needs the account owner)

1. Fill in `OWNERS` with a real GitHub handle.
2. Fork `kubeflow/pipelines-components`, add this directory as
   `components/data_processing/anakin_web_scraper/`.
3. `pip install -e .` and run the test suite for real — never done here.
4. Open a PR per the repo's contribution guide (`AGENTS.md` / `README.md`
   at repo root).

## Not done

Never installed `kfp` or run the tests — verified by close reading against
real reference source and `py_compile` only.
