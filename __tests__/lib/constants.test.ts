import { join } from 'node:path'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'

describe('getCacheKey', () => {
  it('appends artifact tag when signing is enabled', async () => {
    const { getCacheKey } = await import('@/lib/constants')
    const tag = 's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    expect(getCacheKey('abc123', tag)).toBe(`turbogha_abc123#${tag}`)
  })

  it('omits tag suffix when tag is empty', async () => {
    const { getCacheKey } = await import('@/lib/constants')
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

  it('base64url-encodes artifact tags so slashes do not create subdirectories', async () => {
    const { getCacheKey, getTempCachePath } = await import('@/lib/constants')
    const tag = 's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    const key = getCacheKey('7ee20327ec1a3d63', tag)
    const encodedTag = Buffer.from(tag, 'utf8').toString('base64url')
    expect(getTempCachePath(key)).toBe(
      join(
        '/tmp/runner-temp',
        `cache-turbogha_7ee20327ec1a3d63--${encodedTag}.tg.bin`
      )
    )
  })

  it('assigns distinct temp paths per artifact tag', async () => {
    const { getCacheKey, getTempCachePath } = await import('@/lib/constants')
    const hash = '7ee20327ec1a3d63'
    const saveKeyA = getCacheKey(hash, 'tag/a')
    const saveKeyB = getCacheKey(hash, 'tag/b')
    const restoreKey = getCacheKey(hash)

    expect(getTempCachePath(saveKeyA)).not.toBe(getTempCachePath(saveKeyB))
    expect(getTempCachePath(restoreKey)).toBe(
      join('/tmp/runner-temp', 'cache-turbogha_7ee20327ec1a3d63.tg.bin')
    )
  })
})
