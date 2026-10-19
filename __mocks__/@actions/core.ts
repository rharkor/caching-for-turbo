import { vi } from 'vitest'

export const getInput = vi.fn().mockReturnValue('')
export const setFailed = vi.fn()
export const exportVariable = vi.fn()
export const info = vi.fn()
export const error = vi.fn()
export const debug = vi.fn()
