import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['reports/v2/20261007-life-craftsmanship/phase-05/phase05_i_simulation.test.ts'],
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
  },
})
