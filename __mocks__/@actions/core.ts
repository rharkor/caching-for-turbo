import { jest } from '@jest/globals'

export const getInput = jest.fn().mockReturnValue('')
export const setFailed = jest.fn()
export const exportVariable = jest.fn()
export const info = jest.fn()
export const error = jest.fn()
export const debug = jest.fn()
