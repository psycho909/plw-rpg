import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['reports/v2/20261008-content-expansion/phase-07/qa_simulation.test.ts'],
    maxWorkers: 1,
    testTimeout: 0,
    hookTimeout: 120_000,
  },
})
