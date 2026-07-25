import { jest } from '@jest/globals'

export const restoreCache =
  jest.fn<
    (
      paths: string[],
      primaryKey: string,
      restoreKeys?: string[]
    ) => Promise<string | undefined>
  >()

export const saveCache =
  jest.fn<(paths: string[], key: string) => Promise<number>>()
