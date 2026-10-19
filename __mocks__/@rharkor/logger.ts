import { vi } from 'vitest'

export const logger = {
  init: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  success: vi.fn()
}
