/**
 * Wire tool family.
 *
 * Wire is Anakin's catalog of pre-built automation actions across hundreds of
 * sites. The agent loop is: discover an action (`wire_discover` / `wire_catalog`),
 * run it (`wire_action`), and — only for auth-required actions — supply a
 * credential (`wire_identities` / `wire_login`). `wire_build` requests a new
 * action for an unsupported site.
 *
 * These descriptions deliberately stress that Wire has BOTH read (extract data)
 * and write (login/checkout/form) actions, and that many read actions need no
 * auth — otherwise a model assumes Wire is login-only and skips it for tasks it
 * could actually do.
 */

import { AnakinError } from '../client.js'
import type { AnakinTool, ToolContent } from './index.js'
import { okJson } from './index.js'

const wireDiscoverTool: AnakinTool = {
  name: 'wire_discover',
  description:
    'Discover Wire actions for a task from a natural-language intent. Wire is a catalog of pre-built, vetted automation actions across hundreds of popular websites (Amazon, Walmart, LinkedIn, Airbnb, Zillow, and many more). Actions are of two kinds: READ actions that EXTRACT data (search listings, fetch a category\'s products, get a product\'s price/specs/reviews, read a profile, pull dashboard metrics) and WRITE actions that PERFORM interactions (log in, fill checkout, submit a form). Many read actions need no authentication. ALWAYS try this first when a task might be doable on a known site — do NOT assume Wire is only for logins or checkouts; it is often the fastest way to get structured data from a specific site. Returns ranked candidate actions with their action_id, required/optional params, credit cost, and whether auth is needed. Pass the chosen action_id to wire_action.',
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
    'Browse the Wire catalog. With no arguments, lists every supported website and its action count. Pass a catalog `slug` (e.g. "walmart", "amazon", "linkedin") to get that site\'s full action list with exact parameter schemas, each action\'s type (read/write), auth mode (none/optional/required), and credit cost — plus the login fields for credentials-mode sites. Use this to see everything a specific site can do (e.g. which read actions exist for fetching category products) before running one with wire_action.',
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
  handler: async (client, args) => {
    const slug = typeof args['slug'] === 'string' ? args['slug'] : undefined
    const result = await client.wireCatalog(slug)
    return okJson(result)
  },
}

const wireActionTool: AnakinTool = {
  name: 'wire_action',
  description:
    'Execute a pre-built Wire action by action_id and return its result. Discover action_ids first with wire_discover or wire_catalog; `params` must match that action\'s parameter schema. Read actions return the extracted data; this tool transparently polls the async job to completion for you. If the action\'s auth_mode is "required", pass a `credential_id` (get one from wire_identities or wire_login) — most read actions need none. Use this to actually run a site action (e.g. extract a Walmart category\'s products, scrape a LinkedIn profile) rather than to read arbitrary page content.',
  inputSchema: {
    type: 'object',
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
  },
  handler: async (client, args) => {
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
  },
}

const wireIdentitiesTool: AnakinTool = {
  name: 'wire_identities',
  description:
    'List your saved Wire identities and their credentials. An identity is a named account on a site; each credential\'s `id` is the `credential_id` you pass to wire_action to run actions whose auth_mode is "required". Optionally filter by catalog_id. Use this to find an existing credential before running an auth-required action (and check its status is "active", not "expired").',
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
  handler: async (client, args) => {
    const catalogId = typeof args['catalog_id'] === 'string' ? args['catalog_id'] : undefined
    const result = await client.wireIdentities(catalogId)
    return okJson(result)
  },
}

const wireLoginTool: AnakinTool = {
  name: 'wire_login',
  description:
    'Sign in to a credentials-mode site and get a credential_id usable immediately with wire_action. Provide the catalog `slug` and login `params` (the fields that catalog\'s login schema defines, e.g. email/password — see wire_catalog\'s login_input_schema). The password is never stored, only the encrypted session. Only needed for actions whose auth_mode is "required", and only for catalogs that support password sign-in; cookie-based sites use the dashboard connect flow instead.',
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
  handler: async (client, args) => {
    const body: Parameters<typeof client.wireBuild>[0] = {
      website_url: String(args['website_url']),
      goal: String(args['goal']),
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

/** Build an actionable error envelope for an auth failure on wire_action. */
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
        'wire_action with that credential_id.',
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
  wireActionTool,
  wireIdentitiesTool,
  wireLoginTool,
  wireBuildTool,
]
