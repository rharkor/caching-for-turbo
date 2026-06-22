import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('cache paths', () => {
  let tempDir: string
  let originalWorkspace: string | undefined

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'turbogha-constants-'))
    originalWorkspace = process.env.GITHUB_WORKSPACE
    process.env.GITHUB_WORKSPACE = tempDir
  })

  afterEach(() => {
    if (originalWorkspace === undefined) {
      delete process.env.GITHUB_WORKSPACE
    } else {
      process.env.GITHUB_WORKSPACE = originalWorkspace
    }
    rmSync(tempDir, { recursive: true, force: true })
    jest.resetModules()
  })

  it('uses workspace-relative paths that are stable across runners', async () => {
    const {
      getTempCacheRelativePath,
      getTempCachePath,
      turboghaCacheDir
    } = await import('@/lib/constants')

    const key = 'turbogha_abc123'
    expect(getTempCacheRelativePath(key)).toBe(
      `${turboghaCacheDir}/cache-${key}.tg.bin`
    )
    expect(getTempCachePath(key)).toBe(
      join(tempDir, turboghaCacheDir, `cache-${key}.tg.bin`)
    )
  })

  it('does not embed RUNNER_TEMP in github cache paths', async () => {
    const previousRunnerTemp = process.env.RUNNER_TEMP
    process.env.RUNNER_TEMP = '/runner-temp/unique-per-machine'

    const { getTempCacheRelativePath, getTempCachePath } = await import(
      '@/lib/constants'
    )

    const key = 'turbogha_hash'
    expect(getTempCacheRelativePath(key)).not.toContain('runner-temp')
    expect(getTempCachePath(key)).not.toContain('runner-temp')
    expect(getTempCachePath(key)).toContain(tempDir)

    if (previousRunnerTemp === undefined) {
      delete process.env.RUNNER_TEMP
    } else {
      process.env.RUNNER_TEMP = previousRunnerTemp
    }
  })
})
