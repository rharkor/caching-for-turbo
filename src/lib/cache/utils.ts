import { Readable } from 'node:stream'
import { env } from '../env'
import * as core from '@actions/core'
import streamToPromise from 'stream-to-promise'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { getTempCachePath } from '../constants'
import { restoreCache, saveCache } from '@actions/cache'
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
      await saveCache([tempFile], key)
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

    return restoreCache([path], key, [])
  }

  return {
    save,
    restore
  }
}
