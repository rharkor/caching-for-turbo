import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'
import { Readable } from 'node:stream'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

jest.mock('@/lib/core', () => ({
  core: {
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}))

describe('getCacheClient', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'turbogha-cache-test-'))
    process.env.ACTIONS_CACHE_URL = 'https://example.com'
    process.env.ACTIONS_RUNTIME_TOKEN = 'token'
    process.env.RUNNER_TEMP = tempDir
    jest.resetModules()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    delete process.env.ACTIONS_CACHE_URL
    delete process.env.ACTIONS_RUNTIME_TOKEN
    delete process.env.RUNNER_TEMP
  })

  it('queries restore keys with prefix matching for tagged cache entries', async () => {
    const { restoreCache } = await import('../../../mocks/actions-cache')
    const { getCacheClient } = await import('@/lib/providers/cache/utils')
    restoreCache.mockReset()
    restoreCache.mockResolvedValue(undefined)

    const client = getCacheClient()
    const cacheKey = 'turbogha_abc123'
    const restorationPath = join(tempDir, 'cache-turbogha_abc123.tg.bin')

    await client.restore(restorationPath, cacheKey)

    expect(restoreCache).toHaveBeenCalledWith([restorationPath], cacheKey, [
      cacheKey
    ])
  })

  it('uploads tagged artifacts using a tag-free temp path', async () => {
    const { saveCache } = await import('../../../mocks/actions-cache')
    const { getCacheClient } = await import('@/lib/providers/cache/utils')
    saveCache.mockReset()
    saveCache.mockResolvedValue(1)

    const client = getCacheClient()
    const key =
      'turbogha_7ee20327ec1a3d63#s43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    const expectedTempPath = join(
      tempDir,
      'cache-turbogha_7ee20327ec1a3d63.tg.bin'
    )

    await client.save(key, Readable.from(Buffer.from('artifact-bytes')))

    expect(saveCache).toHaveBeenCalledWith([expectedTempPath], key)
  })
})
