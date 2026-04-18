import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    globals: false,
    pool: 'forks',
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
})
