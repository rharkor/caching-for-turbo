import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      '@actions/cache': fileURLToPath(
        new URL('./__tests__/mocks/actions-cache.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/setup.ts']
  }
})
