/**
 * Self-contained HTTP client for the Anakin REST API.
 *
 * Kept deliberately minimal so anakin-mcp has no runtime dependency on the
 * @anakin/sdk Node package. The shape mirrors @anakin/sdk closely enough
 * that swapping over later is a refactor (no behavior change).
 */

const DEFAULT_BASE_URL = 'https://api.anakin.io/v1'
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 60 // 3 minutes total
const REQUEST_TIMEOUT_MS = 30_000

export interface AnakinConfig {
  apiKey: string
  baseUrl?: string
}

export interface ScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'cleanedHtml' | 'json' | 'links' | 'images'>
  generateJson?: boolean
  useBrowser?: boolean
  country?: string
  forceFresh?: boolean
  sessionId?: string
  sessionName?: string
}

export interface MapOptions {
  limit?: number
  depth?: number
  limitPerLevel?: number
  includeSubdomains?: boolean
  includeExternalLinks?: boolean
  useBrowser?: boolean
  search?: string
}

export interface CrawlOptions {
  maxPages?: number
  depth?: number
  country?: string
  useBrowser?: boolean
  includePatterns?: string[]
  excludePatterns?: string[]
  sessionId?: string
  sessionName?: string
}

export interface SearchOptions {
  limit?: number
}

export interface AgenticSearchOptions {
  schema?: Record<string, unknown>
  useBrowser?: boolean
}

export class AnakinError extends Error {
  status: number | undefined
  code: string | undefined
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'AnakinError'
    this.status = status
    this.code = code
  }
}

export class AnakinClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: AnakinConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  }

  // ── HTTP plumbing ─────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }
    const resp = await fetch(this.baseUrl + path, init)

    if (!resp.ok) {
      let message = `${method} ${path} failed (${resp.status})`
      let code: string | undefined
      try {
        const errBody = (await resp.json()) as { error?: string; code?: string }
        if (errBody.error) message = errBody.error
        if (errBody.code) code = errBody.code
      } catch {
        // Body wasn't JSON; keep the generic message.
      }
      throw new AnakinError(message, resp.status, code)
    }

    return (await resp.json()) as T
  }

  private async pollJob<T extends { status?: string; error?: string }>(
    path: string,
  ): Promise<T> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const job = await this.request<T>('GET', path)
      if (job.status === 'completed') return job
      if (job.status === 'failed') {
        throw new AnakinError(`Job failed: ${job.error ?? 'unknown'}`)
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }
    throw new AnakinError('Job timed out after 3 minutes')
  }

  // ── Endpoint wrappers ─────────────────────────────────────────────────

  async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const body: Record<string, unknown> = {
      url,
      formats: options.formats ?? ['markdown'],
      country: options.country ?? 'us',
      useBrowser: options.useBrowser ?? false,
      generateJson: options.generateJson ?? false,
      forceFresh: options.forceFresh ?? false,
    }
    if (options.sessionId !== undefined) body['sessionId'] = options.sessionId
    if (options.sessionName !== undefined) body['sessionName'] = options.sessionName

    const submitted = await this.request<{ jobId: string }>('POST', '/url-scraper', body)
    return await this.pollJob<ScrapeResult>(`/url-scraper/${submitted.jobId}`)
  }

  async map(url: string, options: MapOptions = {}): Promise<MapResult> {
    const body: Record<string, unknown> = {
      url,
      limit: options.limit ?? 100,
      depth: options.depth ?? 2,
      limitPerLevel: options.limitPerLevel ?? 100,
      includeSubdomains: options.includeSubdomains ?? false,
      includeExternalLinks: options.includeExternalLinks ?? false,
      useBrowser: options.useBrowser ?? false,
    }
    if (options.search !== undefined) body['search'] = options.search

    const submitted = await this.request<{ jobId: string }>('POST', '/map', body)
    return await this.pollJob<MapResult>(`/map/${submitted.jobId}`)
  }

  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const body: Record<string, unknown> = {
      url,
      maxPages: options.maxPages ?? 10,
      depth: options.depth ?? 1,
      country: options.country ?? 'us',
      useBrowser: options.useBrowser ?? false,
    }
    if (options.includePatterns) body['includePatterns'] = options.includePatterns
    if (options.excludePatterns) body['excludePatterns'] = options.excludePatterns
    if (options.sessionId !== undefined) body['sessionId'] = options.sessionId
    if (options.sessionName !== undefined) body['sessionName'] = options.sessionName

    const submitted = await this.request<{ jobId: string }>('POST', '/crawl', body)
    return await this.pollJob<CrawlResult>(`/crawl/${submitted.jobId}`)
  }

  /** Synchronous — no polling. */
  async search(prompt: string, options: SearchOptions = {}): Promise<SearchResult> {
    return await this.request<SearchResult>('POST', '/search', {
      prompt,
      limit: options.limit ?? 5,
    })
  }

  async agenticSearch(
    prompt: string,
    options: AgenticSearchOptions = {},
  ): Promise<AgenticSearchResult> {
    const body: Record<string, unknown> = {
      prompt,
      useBrowser: options.useBrowser ?? true,
    }
    if (options.schema !== undefined) body['schema'] = options.schema

    const submitted = await this.request<{ jobId: string }>('POST', '/agentic-search', body)
    return await this.pollJob<AgenticSearchResult>(`/agentic-search/${submitted.jobId}`)
  }

  async wire(actionId: string, params: Record<string, unknown>): Promise<WireResult> {
    const submitted = await this.request<{ jobId: string }>('POST', '/holocron/task', {
      action_id: actionId,
      params,
    })
    return await this.pollJob<WireResult>(`/holocron/jobs/${submitted.jobId}`)
  }
}

// ── Response types (subset of what the API returns) ─────────────────────

export interface ScrapeResult {
  id: string
  url: string
  status: 'completed' | 'failed'
  cached: boolean
  durationMs: number
  markdown?: string
  html?: string
  cleanedHtml?: string
  generatedJson?: Record<string, unknown>
  links?: string[]
  images?: string[]
  error?: string
}

export interface MapResult {
  id: string
  url: string
  links: string[]
  totalLinks: number
  externalLinks: string[]
  totalExternalLinks: number
  durationMs: number
  status?: 'completed' | 'failed'
  error?: string
}

export interface CrawlPage {
  url: string
  status: 'completed' | 'failed'
  markdown?: string
  html?: string
  durationMs: number
  error?: string
}

export interface CrawlResult {
  id: string
  url: string
  totalPages: number
  completedPages: number
  pages: CrawlPage[]
  durationMs: number
  status?: 'completed' | 'failed'
  error?: string
}

export interface SearchResultItem {
  url: string
  title?: string
  snippet?: string
  date?: string
}

export interface SearchResult {
  id: string
  results: SearchResultItem[]
}

export interface AgenticSearchResult {
  id: string
  status: 'completed' | 'failed'
  jobType: string
  cached: boolean
  generatedJson?: {
    summary?: string
    structured_data?: Record<string, unknown>
    data_schema?: Record<string, unknown>
  }
  error?: string
}

export interface WireResult {
  id: string
  status: 'completed' | 'failed'
  actionId: string
  result?: Record<string, unknown>
  error?: string
}
