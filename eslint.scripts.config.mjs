import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

// The release-gating scripts and the build file: plain JavaScript outside
// tsconfig.test.json, so the typed config in eslint.config.mjs cannot parse
// them. `pnpm lint` runs both configs.
export default defineConfig({
  files: ['scripts/**/*.mjs', 'esbuild.mjs'],
  extends: [eslint.configs.recommended],
  languageOptions: {
    globals: { ...globals.node, ...globals.browser },
  },
  rules: {
    'no-unused-vars': ['error', { ignoreRestSiblings: true }],
  },
})
