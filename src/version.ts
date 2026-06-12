/**
 * Package version, injected at build time from package.json via tsup's
 * `define` (see tsup.config.ts). This keeps the CLI's reported version in
 * lockstep with package.json — `npm version` alone is enough, no manual edit.
 *
 * In non-bundled contexts (e.g. vitest, where the define isn't applied) the
 * identifier is absent, so we fall back to a dev sentinel. `typeof` on an
 * undeclared name is safe and never throws.
 */
declare const __VERSION__: string | undefined

export const VERSION: string =
  typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev'
