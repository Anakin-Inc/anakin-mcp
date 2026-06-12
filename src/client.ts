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
  /**
   * Extra fields from a structured error body (Wire's nested envelope), e.g.
   * `connect_url` on AUTH_REQUIRED or `balance`/`required` on
   * INSUFFICIENT_CREDITS. Empty for the legacy flat error shape.
   */
  details: Record<string, unknown> | undefined
  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AnakinError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Append a query string, dropping undefined/empty values. */
function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  )
  if (entries.length === 0) return path
  const q = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `${path}?${q}`
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
      throw await this.toError(method, path, resp)
    }

    return (await resp.json()) as T
  }

  /**
   * Normalize an error response into an AnakinError. Handles two shapes:
   *  - Wire's nested envelope: `{ status: "error", error: { code, message, … } }`
   *  - the legacy flat shape:  `{ error: "msg", code: "CODE" }`
   */
  private async toError(
    method: string,
    path: string,
    resp: Response,
  ): Promise<AnakinError> {
    let message = `${method} ${path} failed (${resp.status})`
    let code: string | undefined
    let details: Record<string, unknown> | undefined
    try {
      const body = (await resp.json()) as Record<string, unknown>
      const err = body['error']
      if (err && typeof err === 'object') {
        // Wire nested envelope.
        const e = err as Record<string, unknown>
        if (typeof e['message'] === 'string') message = e['message']
        if (typeof e['code'] === 'string') code = e['code']
        details = e
      } else if (typeof err === 'string') {
        // Legacy flat envelope.
        message = err
        if (typeof body['code'] === 'string') code = body['code']
      }
    } catch {
      // Body wasn't JSON; keep the generic message.
    }
    return new AnakinError(message, resp.status, code, details)
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

  // ── Wire: discovery ───────────────────────────────────────────────────

  /** Natural-language intent → ranked candidate actions. */
  async wireResolve(q: string, limit?: number): Promise<WireResolveResponse> {
    return await this.request<WireResolveResponse>(
      'GET',
      withQuery('/wire/resolve', { q, limit }),
    )
  }

  /** List every catalog, or one catalog's full action list with param schemas. */
  async wireCatalog(slug?: string): Promise<unknown> {
    const path = slug
      ? `/wire/catalog/${encodeURIComponent(slug)}`
      : '/wire/catalog'
    return await this.request<unknown>('GET', path)
  }

  // ── Wire: execution ───────────────────────────────────────────────────

  /**
   * Submit a task and poll the job to a terminal state. `params` is omitted
   * from the body when empty (some actions take none). Sync actions that
   * return data inline (no `job_id`) are returned directly without polling.
   */
  async wireRun(
    actionId: string,
    params: Record<string, unknown>,
    options: WireRunOptions = {},
  ): Promise<WireJobStatus> {
    const body: Record<string, unknown> = { action_id: actionId }
    if (params && Object.keys(params).length > 0) body['params'] = params
    if (options.credentialId !== undefined) body['credential_id'] = options.credentialId
    if (options.identityId !== undefined) body['identity_id'] = options.identityId

    const accepted = await this.request<WireTaskAccepted>('POST', '/wire/task', body)
    if (!accepted.job_id) {
      // Sync action: terminal data came back inline.
      return accepted as unknown as WireJobStatus
    }
    return await this.pollWireJob(accepted.job_id)
  }

  private async pollWireJob(jobId: string): Promise<WireJobStatus> {
    const path = `/wire/jobs/${jobId}`
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const job = await this.request<WireJobStatus>('GET', path)
      if (job.status === 'completed') return job
      if (job.status === 'failed') {
        const reason = job.error?.message ?? job.error?.code ?? 'unknown'
        throw new AnakinError(
          `Wire job failed: ${reason}`,
          undefined,
          job.error?.code,
          job.error as Record<string, unknown> | undefined,
        )
      }
      // Respect the server's pacing hint when present; clamp to a sane range.
      const wait =
        typeof job.retry_after_ms === 'number' ? job.retry_after_ms : POLL_INTERVAL_MS
      await new Promise((r) => setTimeout(r, Math.min(Math.max(wait, 500), 10_000)))
    }
    throw new AnakinError('Wire job timed out after polling')
  }

  // ── Wire: identities & credentials ────────────────────────────────────

  /** List your identities (and their credentials inline). */
  async wireIdentities(catalogId?: string): Promise<unknown> {
    return await this.request<unknown>(
      'GET',
      withQuery('/wire/identities', { catalog_id: catalogId }),
    )
  }

  /** Credentials-mode sign-in → a credential_id ready for wireRun. */
  async wireLogin(body: WireLoginRequest): Promise<unknown> {
    return await this.request<unknown>('POST', '/wire/login', body)
  }

  // ── Wire: build ───────────────────────────────────────────────────────

  /** Request a brand-new action for a site not yet in the catalog. */
  async wireBuild(body: WireBuildRequest): Promise<unknown> {
    return await this.request<unknown>('POST', '/wire/build-request', body)
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

// ── Wire ────────────────────────────────────────────────────────────────

export interface WireRunOptions {
  /** Required when the action's auth_mode is `required`; honored when `optional`. */
  credentialId?: string
  /** Optional identity selector (server resolves a credential from it). */
  identityId?: string
}

export interface WireTaskAccepted {
  status?: string
  job_id?: string
  poll_url?: string
}

export interface WireJobError {
  code?: string
  message?: string
  details?: string
  /** Present on AUTH_REQUIRED — where to connect the account. */
  connect_url?: string
  [key: string]: unknown
}

export interface WireJobStatus {
  status: 'processing' | 'completed' | 'failed'
  /** Present while processing — server's suggested poll delay. */
  retry_after_ms?: number
  /** Present when completed — the action's extracted/returned data. */
  data?: Record<string, unknown>
  credits_used?: number
  execution_ms?: number
  /** Present when failed. */
  error?: WireJobError
  [key: string]: unknown
}

export interface WireResolveResponse {
  results?: Array<Record<string, unknown>>
  /** Suggested next call. */
  next?: string
}

export interface WireLoginRequest {
  catalog_slug: string
  identity_name?: string
  /** Wheel-defined login fields (e.g. email/password). */
  params?: Record<string, unknown>
  source_id?: string
  source_ref?: Record<string, unknown>
}

export interface WireBuildRequest {
  website_url: string
  goal: string
  catalog_id?: string
  visibility?: 'private' | 'public'
  force?: boolean
}
