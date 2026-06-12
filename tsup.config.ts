import { readFileSync } from 'node:fs'

import { defineConfig } from 'tsup'

// Mirror package.json.version into the bundle so VERSION never drifts from the
// published version. cwd is the package root under `npm run build`.
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string
}

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  shims: true,
  define: {
    __VERSION__: JSON.stringify(version),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
})
