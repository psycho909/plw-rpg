import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['reports/v2/20261006-reward-core/phase-04/loot_monte_carlo.test.ts', 'reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts'],
    maxWorkers: 1,
    testTimeout: 120000,
  },
})
