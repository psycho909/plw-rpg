import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['reports/playtests/20261004-v2-final-qa/review/save-export-race.probe.ts']
  }
})
