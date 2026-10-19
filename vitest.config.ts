import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Vite aliases need forward slashes, including on Windows
const fromRoot = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url)).replaceAll('\\', '/')

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fromRoot('./src/') },
      {
        find: /^@actions\/cache$/,
        replacement: fromRoot('./__tests__/mocks/actions-cache.ts')
      }
    ]
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/setup.ts']
  }
})
