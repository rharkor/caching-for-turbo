import { jest } from '@jest/globals'

export const logger = {
  init: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  success: jest.fn()
}
