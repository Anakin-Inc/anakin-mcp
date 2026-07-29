import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["requests"],
)
def scrape_url(
    url: str,
    api_key: str,
    scraped_content: dsl.Output[dsl.Dataset],
    generate_json: bool = False,
    use_browser: bool = False,
):
    """Scrape a URL with Anakin (https://anakin.io) and save the result as a
    pipeline artifact.

    Turns any website into clean markdown or AI-extracted structured JSON —
    useful as an upstream data-collection step feeding a training or
    evaluation dataset. Submits the scrape job and polls until it completes
    or fails.

    Args:
        url (str): The URL to scrape.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        scraped_content (dsl.Output[dsl.Dataset]): Output artifact — the
            page's markdown (or generated JSON, if requested) is written
            here as plain text/JSON.
        generate_json (bool): AI-extract structured JSON from the page
            content instead of returning markdown. Defaults to False.
        use_browser (bool): Use a headless browser — best for JS-heavy
            sites. Defaults to False.
    """
    import json
    import time

    import requests

    base_url = "https://api.anakin.io/v1"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    print(f"Submitting scrape job for {url}")
    submit = requests.post(
        f"{base_url}/url-scraper",
        headers=headers,
        json={"url": url, "generateJson": generate_json, "useBrowser": use_browser},
        timeout=30,
    )
    submit.raise_for_status()
    job_id = submit.json()["jobId"]

    deadline = time.time() + 300
    job = {}
    while True:
        poll = requests.get(f"{base_url}/url-scraper/{job_id}", headers=headers, timeout=30)
        poll.raise_for_status()
        job = poll.json()
        if job.get("status") in ("completed", "failed"):
            break
        if time.time() >= deadline:
            raise TimeoutError(f"Anakin scrape job {job_id} did not complete within 300s")
        time.sleep(3)

    if job.get("status") == "failed":
        raise RuntimeError(f"Anakin scrape job {job_id} failed: {job.get('error', 'unknown error')}")

    print(f"Scrape completed in {job.get('durationMs')}ms (cached: {job.get('cached')})")

    content = job.get("generatedJson") if generate_json else job.get("markdown")
    with open(scraped_content.path, "w") as f:
        if generate_json:
            json.dump(content, f)
        else:
            f.write(content or "")


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        scrape_url,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
