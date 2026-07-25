import { Readable } from 'node:stream'
import { env } from '../../env'
import streamToPromise from 'stream-to-promise'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { getTempCachePath, useRelativeCachePath } from '../../constants'
import { restoreCache, saveCache } from '@actions/cache'
import { core } from '@/lib/core'

let relativeCachePathLock = Promise.resolve()

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withCachePath<T>(
  path: string,
  operation: (path: string) => Promise<T>
): Promise<T> {
  if (!useRelativeCachePath) {
    return operation(path)
  }

  const previousOperation = relativeCachePathLock
  let releaseLock: (() => void) | undefined
  relativeCachePathLock = new Promise(resolve => {
    releaseLock = resolve
  })

  await previousOperation.catch(() => undefined)

  const previousCwd = process.cwd()
  let changedCwd = false
  try {
    process.chdir(dirname(path))
    changedCwd = true
    return await operation(basename(path))
  } finally {
    if (changedCwd) process.chdir(previousCwd)
    releaseLock?.()
  }
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes('429') || msg.includes('rate limit')
}

class HandledError extends Error {
  status: number
  statusText: string
  data: unknown
  constructor(status: number, statusText: string, data: unknown) {
    super(`${status}: ${statusText}`)
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

function handleFetchError(message: string) {
  return (error: unknown) => {
    if (error instanceof HandledError) {
      core.error(`${message}: ${error.status} ${error.statusText}`)
      core.error(JSON.stringify(error.data))
      throw error
    }
    core.error(`${message}: ${error}`)
    throw error
  }
}

export function getCacheClient() {
  if (!env.valid) {
    throw new Error('Cache API env vars are not set')
  }

  const save = async (key: string, stream: Readable): Promise<void> => {
    try {
      //* Create a temporary file to store the cache
      const tempFile = getTempCachePath(key)
      const writeStream = createWriteStream(tempFile)
      await streamToPromise(stream.pipe(writeStream))
      core.info(`Saved cache to ${tempFile}`)

      core.info(`Saving cache for key: ${key}, path: ${tempFile}`)
      await withCachePath(tempFile, cachePath => saveCache([cachePath], key))
      core.info(`Saved cache ${key}`)

      //* Remove the temporary file
      await unlink(tempFile)
    } catch (error) {
      handleFetchError('Unable to upload cache')(error)
    }
  }

  const restore = async (
    path: string,
    key: string
  ): Promise<string | undefined> => {
    core.info(`Querying cache for key: ${key}, path: ${path}`)

    try {
      return await withCachePath(path, cachePath =>
        restoreCache([cachePath], key, [key])
      )
    } catch (error) {
      if (isRateLimitError(error)) {
        core.warning(
          `Rate limited restoring cache for key ${key}, retrying in 1s`
        )
        await sleep(1000)
        try {
          return await withCachePath(path, cachePath =>
            restoreCache([cachePath], key, [key])
          )
        } catch (retryError) {
          core.warning(
            `Failed to restore cache for key ${key} after retry: ${retryError}`
          )
          return undefined
        }
      }
      throw error
    }
  }

  return {
    save,
    restore
  }
}
