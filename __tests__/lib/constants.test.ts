import { join } from 'node:path'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'
import { getCacheKey, getTempCachePath } from '../../src/lib/constants'

describe('getCacheKey', () => {
  it('appends artifact tag when signing is enabled', async () => {
    const tag = 's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    expect(getCacheKey('abc123', tag)).toBe(`turbogha_abc123#${tag}`)
  })

  it('omits tag suffix when tag is empty', async () => {
    expect(getCacheKey('abc123', '')).toBe('turbogha_abc123')
    expect(getCacheKey('abc123')).toBe('turbogha_abc123')
  })
})

describe('getTempCachePath', () => {
  const originalRunnerTemp = process.env.RUNNER_TEMP

  beforeEach(() => {
    process.env.RUNNER_TEMP = '/tmp/runner-temp'
    jest.resetModules()
  })

  afterEach(() => {
    if (originalRunnerTemp === undefined) {
      delete process.env.RUNNER_TEMP
    } else {
      process.env.RUNNER_TEMP = originalRunnerTemp
    }
    jest.resetModules()
  })

  it('strips artifact tag so base64 slashes do not create subdirectories', async () => {
    const key = getCacheKey(
      '7ee20327ec1a3d63',
      's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    )
    expect(getTempCachePath(key)).toBe(
      join('/tmp/runner-temp', 'cache-turbogha_7ee20327ec1a3d63.tg.bin')
    )
  })

  it('uses the same temp path for save and restore keys', async () => {
    const hash = '7ee20327ec1a3d63'
    const tag = 's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    const saveKey = getCacheKey(hash, tag)
    const restoreKey = getCacheKey(hash)
    expect(getTempCachePath(saveKey)).toBe(getTempCachePath(restoreKey))
  })
})
