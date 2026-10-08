import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['reports/v2/20261008-regional-crisis/phase-06/phase06_i_simulation.test.ts'],
    maxWorkers: 1,
    testTimeout: 3_600_000,
    fileParallelism: false,
  },
})
