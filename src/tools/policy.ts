/**
 * Connector policy guards.
 *
 * Anthropic's Connectors Directory PROHIBITS a connector from "executing
 * financial transactions or transferring assets" — see
 * compliance/policies/01-software-directory-policy.md and the directory's
 * compliance acknowledgments. Anakin Wire is a broad automation catalog that
 * *could* include checkout/payment actions, so the write path refuses any action
 * that looks like it completes a payment or transfers funds.
 *
 * This is a defense-in-depth guard on top of whatever catalog the Anakin API
 * exposes to the connector; the authoritative exclusion of payment-execution
 * actions should ALSO happen catalog-side. The match is intentionally
 * conservative — it targets payment *completion* and fund *transfer* (pay,
 * checkout, purchase, place order, buy now, wire transfer, remit, payout, charge
 * card), NOT benign writes like "add to cart" or "submit a form", and never
 * touches read actions.
 *
 * Tunable via env:
 *   ANAKIN_BLOCKED_ACTION_PATTERNS  comma-separated extra regex fragments to block
 *   ANAKIN_ALLOW_FINANCIAL=true     disable the guard (NOT for the directory build)
 */

const DEFAULT_FINANCIAL_PATTERN =
  /\b(payments?|pay\s?now|checkout|purchase|place\s?order|buy\s?now|wire\s?transfer|remit(?:tance)?|payout|charge\s?card|transfer\s?funds)\b/i

/**
 * Normalize separators so word boundaries work on snake_case / kebab-case action
 * ids: `\b` doesn't break on `_`, so "amazon_checkout" must become
 * "amazon checkout" for `\bcheckout\b` to match. Patterns therefore match
 * against a space-separated form.
 */
function normalize(text: string): string {
  return text.replace(/[_-]+/g, ' ')
}

function extraPatterns(env: NodeJS.ProcessEnv): RegExp[] {
  const raw = env['ANAKIN_BLOCKED_ACTION_PATTERNS']
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => new RegExp(s, 'i'))
}

/**
 * If `text` (an action id + serialized params, or a build goal + site) looks
 * like a financial transaction, return a human-readable refusal reason; else
 * return undefined. Applied to WRITE actions and build requests only.
 */
export function financialBlockReason(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (env['ANAKIN_ALLOW_FINANCIAL'] === 'true') return undefined
  const haystack = normalize(text)
  const patterns = [DEFAULT_FINANCIAL_PATTERN, ...extraPatterns(env)]
  if (patterns.some((p) => p.test(haystack))) {
    return (
      'This connector does not perform financial transactions or transfer funds/assets, ' +
      'so this action was not run (Anthropic Connectors Directory policy). Use a read ' +
      'action to look up information, or complete any payment directly on the site.'
    )
  }
  return undefined
}

/** Safe stringify for building the haystack from action params. */
export function describeParams(params: Record<string, unknown>): string {
  try {
    return JSON.stringify(params ?? {})
  } catch {
    return ''
  }
}
