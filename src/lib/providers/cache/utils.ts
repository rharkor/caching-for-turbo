import { Readable } from 'node:stream'
import { env } from '../../env'
import streamToPromise from 'stream-to-promise'
import { createWriteStream } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getTempCachePath, getTempCacheRelativePath } from '../../constants'
import { restoreCache, saveCache } from '@actions/cache'
import { core } from '@/lib/core'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      const cachePath = getTempCacheRelativePath(key)
      await mkdir(dirname(tempFile), { recursive: true })
      const writeStream = createWriteStream(tempFile)
      await streamToPromise(stream.pipe(writeStream))
      core.info(`Saved cache to ${tempFile}`)

      // Use a workspace-relative path so cache version hashes match across runners.
      core.info(`Saving cache for key: ${key}, path: ${cachePath}`)
      await saveCache([cachePath], key)
      core.info(`Saved cache ${key}`)

      //* Remove the temporary file
      await unlink(tempFile)
    } catch (error) {
      handleFetchError('Unable to upload cache')(error)
    }
  }

  const restore = async (
    cachePath: string,
    key: string
  ): Promise<string | undefined> => {
    core.info(`Querying cache for key: ${key}, path: ${cachePath}`)

    try {
      return await restoreCache([cachePath], key, [])
    } catch (error) {
      if (isRateLimitError(error)) {
        core.warning(
          `Rate limited restoring cache for key ${key}, retrying in 1s`
        )
        await sleep(1000)
        try {
          return await restoreCache([cachePath], key, [])
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
