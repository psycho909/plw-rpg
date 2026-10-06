import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['reports/v2/20261006-reward-core/phase-02/loot_sample.test.ts', 'reports/v2/20261006-reward-core/long-term/long_world.test.ts', 'reports/v2/20261006-reward-core/phase-03/fight_sim.test.ts'], maxWorkers: 1 } })
