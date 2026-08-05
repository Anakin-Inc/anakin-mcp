/**
 * Wire tool family.
 *
 * Wire is Anakin's catalog of pre-built automation actions across hundreds of
 * sites. The agent loop is: discover an action (`wire_discover` / `wire_catalog`),
 * run it, and — only for auth-required actions — supply a credential
 * (`wire_identities` / `wire_login`). `wire_build` requests a new action for an
 * unsupported site.
 *
 * Execution is split into TWO tools by the action's `type`, which discovery and
 * the catalog always report:
 *   - `wire_read_action`  — READ actions that EXTRACT data (read-only).
 *   - `wire_write_action` — WRITE actions that PERFORM state-changing
 *     interactions (submit a form, place into a cart, etc.) — destructive.
 * This separation is mandatory for the Connectors Directory, which rejects a
 * single catch-all tool that mixes safe (read) and unsafe (write) operations
 * behind one parameter, and lets each tool carry an honest safety annotation
 * (readOnlyHint vs destructiveHint). See
 * compliance/policies/03-review-criteria-checklist.md.
 *
 * The descriptions deliberately stress that Wire has BOTH read and write
 * actions, and that many read actions need no auth — otherwise a model assumes
 * Wire is login-only and skips it for tasks it could actually do.
 */

import { AnakinError } from '../client.js'
import type { AnakinTool, ToolContent } from './index.js'
import { okJson } from './index.js'
import { financialBlockReason, describeParams } from './policy.js'

const wireDiscoverTool: AnakinTool = {
  name: 'wire_discover',
  description:
    'Find Wire actions for a task from a natural-language intent. Wire is a catalog of pre-built automation actions across hundreds of websites (Amazon, Walmart, LinkedIn, Airbnb, Zillow, and others). Actions are of two kinds: READ actions that extract data (search listings, fetch a category\'s products, get a product\'s price/specs/reviews, read a profile, pull dashboard metrics) and WRITE actions that perform interactions (log in, submit a form). Many read actions need no authentication. Applicable when a task may be achievable on a specific known site, for data extraction as well as interactions. Returns ranked candidate actions, each with its action_id, type ("read" or "write"), required/optional params, credit cost, and whether auth is needed. Run a returned action with wire_read_action (when its type is "read") or wire_write_action (when its type is "write").',
  annotations: {
    title: 'Discover Wire actions',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        description:
          'The intent in natural language, e.g. "top phones on walmart", "search airbnb listings in Lisbon", "a linkedin profile\'s work history".',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of candidate actions to return.',
        minimum: 1,
        default: 5,
      },
    },
    required: ['q'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    description: 'Ranked candidate Wire actions for the given intent.',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          description:
            'A candidate action — action_id, type (read/write), required/optional params, credit cost, whether auth is needed.',
        },
      },
      next: { type: 'string', description: 'Suggested next call.' },
    },
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const q = String(args['q'])
    const limit = typeof args['limit'] === 'number' ? args['limit'] : undefined
    const result = await client.wireResolve(q, limit)
    return okJson(result)
  },
}

const wireCatalogTool: AnakinTool = {
  name: 'wire_catalog',
  description:
    'Browse the Wire catalog. With no arguments, lists every supported website and its action count. Pass a catalog `slug` (e.g. "walmart", "amazon", "linkedin") to get that site\'s full action list with exact parameter schemas, each action\'s type (read/write), auth mode (none/optional/required), and credit cost — plus the login fields for credentials-mode sites. Use this to see everything a specific site can do (e.g. which read actions exist for fetching category products) before running one with wire_read_action or wire_write_action.',
  annotations: {
    title: 'Browse the Wire catalog',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description:
          'Catalog slug to inspect (e.g. "walmart"). Omit to list all catalogs.',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    description:
      "With no slug: every supported catalog and its action count. With a slug: that catalog's full action list (each action's id, type, parameter schema, auth mode, credit cost) plus login fields for credentials-mode sites.",
    additionalProperties: true,
  },
  handler: async (client, args) => {
    const slug = typeof args['slug'] === 'string' ? args['slug'] : undefined
    const result = await client.wireCatalog(slug)
    return okJson(result)
  },
}

/**
 * Shared parameter schema for the two execution tools. The `action_id` already
 * encodes which action runs; the read/write split lives in two separate tools
 * (not a method parameter) so each can carry an honest safety annotation.
 */
const wireActionInputSchema = {
  type: 'object' as const,
  properties: {
    action_id: {
      type: 'string',
      description: 'The action to run (from wire_discover / wire_catalog).',
    },
    params: {
      type: 'object',
      description:
        "The action's input parameters. Shape depends on the action — use its parameter schema from discovery. Omit for actions that take none.",
      additionalProperties: true,
    },
    credential_id: {
      type: 'string',
      description:
        'Required when the action\'s auth_mode is "required"; honored when "optional"; ignored when "none". Get one from wire_identities or wire_login.',
    },
    identity_id: {
      type: 'string',
      description:
        'Optional identity selector — the server resolves a credential from it (alternative to credential_id).',
    },
  },
  required: ['action_id'],
  additionalProperties: false,
}

/** Shared output schema for wire_read_action / wire_write_action. */
const wireJobOutputSchema = {
  type: 'object' as const,
  properties: {
    status: { type: 'string', enum: ['processing', 'completed', 'failed'] },
    retry_after_ms: {
      type: 'integer',
      description: "Present while processing — server's suggested poll delay.",
    },
    data: {
      type: 'object',
      additionalProperties: true,
      description: "Present when completed — the action's extracted/returned data.",
    },
    credits_used: { type: 'number' },
    execution_ms: { type: 'number' },
  },
  required: ['status'],
  // Sync actions may return extra top-level fields inline (their result data,
  // not nested under `data`) — see AnakinClient.wireRun.
  additionalProperties: true,
}

/** Shared execution path for wire_read_action / wire_write_action. */
async function runWireAction(
  client: Parameters<AnakinTool['handler']>[0],
  args: Record<string, unknown>,
): Promise<ToolContent> {
  const actionId = String(args['action_id'])
  const params = (args['params'] ?? {}) as Record<string, unknown>

  const options: Parameters<typeof client.wireRun>[2] = {}
  if (typeof args['credential_id'] === 'string') options.credentialId = args['credential_id']
  if (typeof args['identity_id'] === 'string') options.identityId = args['identity_id']

  try {
    const job = await client.wireRun(actionId, params, options)
    return okJson(job)
  } catch (err) {
    // Turn auth failures into actionable guidance instead of a bare error.
    if (
      err instanceof AnakinError &&
      (err.code === 'AUTH_REQUIRED' ||
        err.code === 'AUTH_EXPIRED' ||
        err.code === 'FORBIDDEN')
    ) {
      return authGuidance(actionId, err)
    }
    throw err
  }
}

const wireReadActionTool: AnakinTool = {
  name: 'wire_read_action',
  description:
    'Run a Wire READ action — one whose type is "read" (it EXTRACTS data and does not change state on the target site): search listings, fetch a category\'s products, get a product\'s price/specs/reviews, read a profile, pull dashboard metrics. Discover action_ids first with wire_discover or wire_catalog and confirm the action\'s type is "read"; `params` must match that action\'s parameter schema. This tool transparently polls the async job to completion and returns the extracted data. Most read actions need no auth; if the action\'s auth_mode is "required" (e.g. reading data behind a login), pass a `credential_id` from wire_identities or wire_login. For state-changing actions (type "write") use wire_write_action instead.',
  annotations: {
    title: 'Run a Wire read action',
    readOnlyHint: true,
    openWorldHint: true,
  },
  inputSchema: wireActionInputSchema,
  outputSchema: wireJobOutputSchema,
  handler: runWireAction,
}

const wireWriteActionTool: AnakinTool = {
  name: 'wire_write_action',
  description:
    'Run a Wire WRITE action — one whose type is "write" (it performs a state-changing interaction on the target site): submit a form, add an item to a cart, post or send content, update account settings. Discover action_ids first with wire_discover or wire_catalog and confirm the action\'s type is "write"; `params` must match that action\'s parameter schema. Most write actions need auth — pass a `credential_id` from wire_identities or wire_login. This tool transparently polls the async job to completion and returns its result. It does not execute payments or transfer funds; such actions are refused. For data extraction that does not change state (type "read") use wire_read_action instead.',
  annotations: {
    title: 'Run a Wire write action',
    // Write actions change state on the target site → always prompt the user.
    destructiveHint: true,
    openWorldHint: true,
  },
  inputSchema: wireActionInputSchema,
  outputSchema: wireJobOutputSchema,
  handler: async (client, args) => {
    const actionId = String(args['action_id'])
    const params = (args['params'] ?? {}) as Record<string, unknown>
    // Directory policy: never execute financial transactions / asset transfers.
    const blocked = financialBlockReason(`${actionId} ${describeParams(params)}`)
    if (blocked) return { isError: true, content: [{ type: 'text', text: blocked }] }
    return runWireAction(client, args)
  },
}

const wireIdentitiesTool: AnakinTool = {
  name: 'wire_identities',
  description:
    'List your saved Wire identities and their credentials. An identity is a named account on a site; each credential\'s `id` is the `credential_id` you pass to wire_read_action / wire_write_action to run actions whose auth_mode is "required". Optionally filter by catalog_id. Use this to find an existing credential before running an auth-required action (and check its status is "active", not "expired").',
  annotations: {
    title: 'List Wire identities',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      catalog_id: {
        type: 'string',
        description: 'Optional — restrict to identities for a single catalog.',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    description: 'Your saved Wire identities and their credentials (id, status, catalog).',
    additionalProperties: true,
  },
  handler: async (client, args) => {
    const catalogId = typeof args['catalog_id'] === 'string' ? args['catalog_id'] : undefined
    const result = await client.wireIdentities(catalogId)
    return okJson(result)
  },
}

const wireLoginTool: AnakinTool = {
  name: 'wire_login',
  description:
    'Sign in to a credentials-mode site and get a credential_id usable immediately with wire_read_action / wire_write_action. Provide the catalog `slug` and login `params` (the fields that catalog\'s login schema defines, e.g. email/password — see wire_catalog\'s login_input_schema). The password is never stored, only the encrypted session. Only needed for actions whose auth_mode is "required", and only for catalogs that support password sign-in; cookie-based sites use the dashboard connect flow instead.',
  annotations: {
    title: 'Sign in to a Wire site',
    // Establishes and stores an encrypted session (a side effect) → prompt.
    destructiveHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      catalog_slug: {
        type: 'string',
        description: 'The catalog to sign in to (e.g. "neb").',
      },
      params: {
        type: 'object',
        description:
          "Login fields defined by the catalog (e.g. { email, password }). Use wire_catalog's login_input_schema to learn the field names.",
        additionalProperties: true,
      },
      identity_name: {
        type: 'string',
        description:
          'Optional name for the identity. Derived from params in password mode; required when using a 1Password locator.',
      },
      source_id: {
        type: 'string',
        description: 'Optional 1Password identity-source ID (alternative to params).',
      },
      source_ref: {
        type: 'object',
        description:
          'Optional 1Password item locator { vault_id, item_id, fields } (use with source_id instead of params).',
        additionalProperties: true,
      },
    },
    required: ['catalog_slug'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    description: 'The resulting identity and credential.',
    additionalProperties: true,
  },
  handler: async (client, args) => {
    const body: Parameters<typeof client.wireLogin>[0] = {
      catalog_slug: String(args['catalog_slug']),
    }
    if (typeof args['params'] === 'object' && args['params'] !== null) {
      body.params = args['params'] as Record<string, unknown>
    }
    if (typeof args['identity_name'] === 'string') body.identity_name = args['identity_name']
    if (typeof args['source_id'] === 'string') body.source_id = args['source_id']
    if (typeof args['source_ref'] === 'object' && args['source_ref'] !== null) {
      body.source_ref = args['source_ref'] as Record<string, unknown>
    }

    const result = await client.wireLogin(body)
    return okJson(result)
  },
}

const wireBuildTool: AnakinTool = {
  name: 'wire_build',
  description:
    "Request a brand-new Wire action for a website that isn't in the catalog yet. Describe the site (`website_url`) and what the action should do or extract (`goal`); Wire generates and auto-tests a scraper, then publishes it. Asynchronous (returns status \"pending\") and charges credits, refunded automatically if the build fails. Only use this after wire_discover / wire_catalog confirm no existing action covers the site.",
  annotations: {
    title: 'Build a new Wire action',
    // Spends credits and publishes a new catalog action (a side effect) → prompt.
    destructiveHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      website_url: {
        type: 'string',
        description: 'The site to build an action for. The domain is extracted automatically.',
      },
      goal: {
        type: 'string',
        description:
          'Natural-language description of what the action should do or extract. Be specific — the builder synthesizes the scraper from this.',
      },
      catalog_id: {
        type: 'string',
        description: 'Optional — attach to an existing catalog instead of creating one.',
      },
      visibility: {
        type: 'string',
        enum: ['private', 'public'],
        description: 'Action visibility. Defaults to private.',
        default: 'private',
      },
      force: {
        type: 'boolean',
        description:
          'Build even if similar actions already exist for the domain (otherwise the request is rejected with ACTION_EXISTS).',
        default: false,
      },
    },
    required: ['website_url', 'goal'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'e.g. "pending" — the build runs asynchronously.',
      },
    },
    additionalProperties: true,
  },
  handler: async (client, args) => {
    const websiteUrl = String(args['website_url'])
    const goal = String(args['goal'])
    // Don't build payment/transfer actions either — keep the catalog compliant.
    const blocked = financialBlockReason(`${goal} ${websiteUrl}`)
    if (blocked) return { isError: true, content: [{ type: 'text', text: blocked }] }

    const body: Parameters<typeof client.wireBuild>[0] = {
      website_url: websiteUrl,
      goal,
    }
    if (typeof args['catalog_id'] === 'string') body.catalog_id = args['catalog_id']
    if (args['visibility'] === 'private' || args['visibility'] === 'public') {
      body.visibility = args['visibility']
    }
    if (typeof args['force'] === 'boolean') body.force = args['force']

    const result = await client.wireBuild(body)
    return okJson(result)
  },
}

/** Build an actionable error envelope for an auth failure running a Wire action. */
function authGuidance(actionId: string, err: AnakinError): ToolContent {
  const connectUrl =
    typeof err.details?.['connect_url'] === 'string'
      ? (err.details['connect_url'] as string)
      : undefined

  const lines = [`Action "${actionId}" could not run — ${err.code}: ${err.message}`]
  if (err.code === 'AUTH_REQUIRED') {
    lines.push(
      'This action requires authentication. Either call wire_identities to find an existing ' +
        'credential_id for this catalog, or call wire_login to sign in and get one, then retry ' +
        'the same wire_read_action / wire_write_action call with that credential_id.',
    )
    if (connectUrl) lines.push(`Or connect the account interactively at: ${connectUrl}`)
  } else if (err.code === 'AUTH_EXPIRED') {
    lines.push(
      'The saved credential has expired. Reconnect it (wire_login) and retry with the new credential_id.',
    )
  } else {
    lines.push(
      "The credential_id is invalid for this action (wrong owner or catalog). Re-fetch a valid one via wire_identities.",
    )
  }
  return { isError: true, content: [{ type: 'text', text: lines.join('\n') }] }
}

export const wireTools: AnakinTool[] = [
  wireDiscoverTool,
  wireCatalogTool,
  wireReadActionTool,
  wireWriteActionTool,
  wireIdentitiesTool,
  wireLoginTool,
  wireBuildTool,
]
