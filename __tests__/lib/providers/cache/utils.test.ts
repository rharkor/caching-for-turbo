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
    warning: jest.fn(),
    getInput: jest.fn(() => '')
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

  it('uploads tagged artifacts using a filesystem-safe unique temp path', async () => {
    const { saveCache } = await import('../../../mocks/actions-cache')
    const { getCacheClient } = await import('@/lib/providers/cache/utils')
    saveCache.mockReset()
    saveCache.mockResolvedValue(1)

    const client = getCacheClient()
    const tag = 's43Vqe9K4fqUlFo3c/2drvp46vUGR8lLgb+28BwGUJM='
    const key = `turbogha_7ee20327ec1a3d63#${tag}`
    const encodedTag = Buffer.from(tag, 'utf8').toString('base64url')
    const expectedTempPath = join(
      tempDir,
      `cache-turbogha_7ee20327ec1a3d63--${encodedTag}.tg.bin`
    )

    await client.save(key, Readable.from(Buffer.from('artifact-bytes')))

    expect(saveCache).toHaveBeenCalledWith([expectedTempPath], key)
  })

  it('retries once when a save returns no id, then succeeds', async () => {
    const { saveCache } = await import('../../../mocks/actions-cache')
    const { core } = await import('@/lib/core')
    const { getCacheClient } = await import('@/lib/providers/cache/utils')
    saveCache.mockReset()
    saveCache.mockResolvedValueOnce(-1).mockResolvedValueOnce(42)
    jest.mocked(core.warning).mockClear()
    jest.mocked(core.info).mockClear()

    const client = getCacheClient()
    await client.save('turbogha_retry', Readable.from(Buffer.from('bytes')))

    expect(saveCache).toHaveBeenCalledTimes(2)
    expect(core.info).toHaveBeenCalledWith('Saved cache turbogha_retry')
    expect(core.warning).not.toHaveBeenCalledWith(
      'Cache not saved for key turbogha_retry'
    )
  })

  it('reports the save as not saved when the retry also returns no id', async () => {
    const { saveCache } = await import('../../../mocks/actions-cache')
    const { core } = await import('@/lib/core')
    const { getCacheClient } = await import('@/lib/providers/cache/utils')
    saveCache.mockReset()
    saveCache.mockResolvedValue(-1)
    jest.mocked(core.warning).mockClear()
    jest.mocked(core.info).mockClear()

    const client = getCacheClient()
    await client.save('turbogha_fail', Readable.from(Buffer.from('bytes')))

    expect(saveCache).toHaveBeenCalledTimes(2)
    expect(core.warning).toHaveBeenCalledWith(
      'Cache not saved for key turbogha_fail'
    )
    expect(core.info).not.toHaveBeenCalledWith('Saved cache turbogha_fail')
  })
})
