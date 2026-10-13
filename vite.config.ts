import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['src/**/*.test.ts'],
    // Keep long world simulations from sharing CPU with other test files.
    maxWorkers: 1,
  },
})
