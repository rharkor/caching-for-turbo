import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'
import { mkdirSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { chdir } from 'node:process'

describe('withWorkspaceRoot', () => {
  let workspaceRoot: string
  let nestedDir: string
  let originalWorkspace: string | undefined
  let originalCwd: string

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'turbogha-workspace-'))
    nestedDir = join(workspaceRoot, 'packages', 'app')
    mkdirSync(nestedDir, { recursive: true })
    originalWorkspace = process.env.GITHUB_WORKSPACE
    originalCwd = process.cwd()
    process.env.GITHUB_WORKSPACE = workspaceRoot
    chdir(nestedDir)
  })

  afterEach(() => {
    chdir(originalCwd)
    if (originalWorkspace === undefined) {
      delete process.env.GITHUB_WORKSPACE
    } else {
      process.env.GITHUB_WORKSPACE = originalWorkspace
    }
    rmSync(workspaceRoot, { recursive: true, force: true })
    jest.resetModules()
  })

  it('runs cache operations from the workspace root when cwd is nested', async () => {
    const { withWorkspaceRoot } = await import('@/lib/workspace')
    const { getTempCacheRelativePath } = await import('@/lib/constants')

    const key = 'turbogha_abc123'
    const relativePath = getTempCacheRelativePath(key)

    await withWorkspaceRoot(async () => {
      expect(process.cwd()).toBe(workspaceRoot)
      expect(join(process.cwd(), relativePath)).toBe(
        join(workspaceRoot, '.turbogha-cache', `cache-${key}.tg.bin`)
      )
    })

    expect(process.cwd()).toBe(nestedDir)
  })
})

describe('cleanupWorkspaceCache', () => {
  let workspaceRoot: string
  let originalWorkspace: string | undefined
  let originalCwd: string

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'turbogha-cleanup-'))
    originalWorkspace = process.env.GITHUB_WORKSPACE
    originalCwd = process.cwd()
    process.env.GITHUB_WORKSPACE = workspaceRoot
    chdir(workspaceRoot)
  })

  afterEach(() => {
    chdir(originalCwd)
    if (originalWorkspace === undefined) {
      delete process.env.GITHUB_WORKSPACE
    } else {
      process.env.GITHUB_WORKSPACE = originalWorkspace
    }
    rmSync(workspaceRoot, { recursive: true, force: true })
    jest.resetModules()
  })

  it('removes the workspace cache directory', async () => {
    const cacheDir = join(workspaceRoot, '.turbogha-cache')
    mkdirSync(cacheDir, { recursive: true })

    const { cleanupWorkspaceCache } = await import('@/lib/workspace')
    await cleanupWorkspaceCache()

    expect(() => rmSync(cacheDir)).toThrow()
  })
})
