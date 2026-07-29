import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def crawl_site(
    url: str,
    api_key: str,
    crawled_pages: dsl.Output[dsl.Dataset],
    max_pages: int = 10,
    depth: int = 1,
    country: str = "us",
    use_browser: bool = False,
    include_patterns_csv: str = "",
    exclude_patterns_csv: str = "",
    session_id: str = "",
):
    """Bulk-fetch markdown across a site with Anakin (https://anakin.io) and
    save the pages as a pipeline artifact.

    Useful when a downstream step needs the contents of many pages at once
    (catalog ingestion, site-wide RAG corpus). Pair with
    include_patterns_csv / exclude_patterns_csv to scope which URLs are
    fetched. Submits the job and polls until it completes or fails.

    Args:
        url (str): Starting URL.
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        crawled_pages (dsl.Output[dsl.Dataset]): Output artifact -- a JSON
            object {"url", "totalPages", "completedPages", "pages",
            "durationMs"} is written here ("pages" is a list of {"url",
            "status", "markdown", "durationMs", "error"}).
        max_pages (int): Hard cap on pages fetched. Defaults to 10.
        depth (int): Link-hops from the starting URL to follow. Defaults to
            1.
        country (str): Two-letter proxy egress country code. Defaults to
            "us".
        use_browser (bool): Render each page in a headless browser -- for
            SPAs. Defaults to False.
        include_patterns_csv (str): Comma-separated glob/regex patterns.
            Only URLs matching at least one pattern are fetched. Empty
            string means no filter.
        exclude_patterns_csv (str): Comma-separated glob/regex patterns.
            URLs matching any pattern are skipped. Empty string means no
            filter.
        session_id (str): Optional saved-browser-session ID (see
            anakin_session_list) for login-protected sites.
    """
    import json

    from anakin import Anakin

    include_patterns = [p.strip() for p in include_patterns_csv.split(",") if p.strip()]
    exclude_patterns = [p.strip() for p in exclude_patterns_csv.split(",") if p.strip()]

    client = Anakin(api_key=api_key)
    print(f"Crawling {url} (max_pages={max_pages}, depth={depth})")
    result = client.crawl(
        url,
        max_pages=max_pages,
        depth=depth,
        include_patterns=include_patterns,
        exclude_patterns=exclude_patterns,
        country=country,
        use_browser=use_browser,
        session_id=session_id or None,
    )
    print(f"Crawled {result.completed_pages}/{result.total_pages} page(s)")

    payload = {
        "url": result.url,
        "totalPages": result.total_pages,
        "completedPages": result.completed_pages,
        "pages": [p.model_dump(exclude_none=True) for p in result.pages],
        "durationMs": result.duration_ms,
    }
    with open(crawled_pages.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        crawl_site,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
