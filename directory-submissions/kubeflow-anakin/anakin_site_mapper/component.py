import kfp.compiler
from kfp import dsl


@dsl.component(
    packages_to_install=["anakin-sdk"],
)
def map_site(
    url: str,
    api_key: str,
    site_map: dsl.Output[dsl.Dataset],
    limit: int = 100,
    depth: int = 2,
    limit_per_level: int = 100,
    include_subdomains: bool = False,
    include_external_links: bool = False,
    use_browser: bool = False,
    search: str = "",
):
    """Discover all reachable URLs under a site with Anakin
    (https://anakin.io) and save the link graph as a pipeline artifact.

    Useful for understanding a domain's structure before crawling, or for
    fanning out the sub-pages a downstream anakin_web_scraper /
    anakin_site_crawler step should fetch. Submits the job and polls until
    it completes or fails.

    Args:
        url (str): The starting URL for discovery (typically a homepage or
            section root).
        api_key (str): Anakin API key. Get a free one at
            https://anakin.io/dashboard (300 credits, no card required).
        site_map (dsl.Output[dsl.Dataset]): Output artifact -- a JSON object
            {"url", "links", "totalLinks", "externalLinks",
            "totalExternalLinks", "durationMs"} is written here.
        limit (int): Maximum number of URLs to return overall. Defaults to
            100.
        depth (int): How many link-hops from the starting URL to follow.
            Defaults to 2.
        limit_per_level (int): Maximum URLs collected per depth level.
            Defaults to 100.
        include_subdomains (bool): Include URLs on subdomains of the
            starting host. Defaults to False.
        include_external_links (bool): Also collect (but do not follow)
            external links. Defaults to False.
        use_browser (bool): Render with a headless browser -- best for
            SPAs. Defaults to False.
        search (str): Optional keyword filter -- only return URLs whose
            path/title matches. Empty string means no filter.
    """
    import json

    from anakin import Anakin

    client = Anakin(api_key=api_key)
    print(f"Mapping {url} (depth={depth}, limit={limit})")
    result = client.map(
        url,
        limit=limit,
        depth=depth,
        limit_per_level=limit_per_level,
        include_subdomains=include_subdomains,
        include_external_links=include_external_links,
        use_browser=use_browser,
        search=search or None,
    )
    print(f"Discovered {result.total_links} link(s), {result.total_external_links} external")

    payload = {
        "url": result.url,
        "links": result.links,
        "totalLinks": result.total_links,
        "externalLinks": result.external_links,
        "totalExternalLinks": result.total_external_links,
        "durationMs": result.duration_ms,
    }
    with open(site_map.path, "w") as f:
        json.dump(payload, f, default=str)


if __name__ == "__main__":
    kfp.compiler.Compiler().compile(
        map_site,
        package_path=__file__.replace(".py", "_component.yaml"),
    )
