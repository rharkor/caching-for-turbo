import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chdir } from 'node:process'
import { getWorkspaceRoot, turboghaCacheDir } from './constants'

export function ensureWorkspaceRoot(): void {
  const workspaceRoot = getWorkspaceRoot()
  if (process.cwd() !== workspaceRoot) {
    chdir(workspaceRoot)
  }
}

export async function withWorkspaceRoot<T>(fn: () => Promise<T>): Promise<T> {
  const workspaceRoot = getWorkspaceRoot()
  const previousCwd = process.cwd()
  if (previousCwd !== workspaceRoot) {
    chdir(workspaceRoot)
  }
  try {
    return await fn()
  } finally {
    if (previousCwd !== workspaceRoot) {
      chdir(previousCwd)
    }
  }
}

export async function cleanupWorkspaceCache(): Promise<void> {
  await rm(join(getWorkspaceRoot(), turboghaCacheDir), {
    recursive: true,
    force: true
  })
}
