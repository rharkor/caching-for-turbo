import { Readable } from 'node:stream'
import { env } from '../env'
import * as core from '@actions/core'
import * as cacheTwirpClient from '@actions/cache/lib/internal/shared/cacheTwirpClient'
import * as utils from '@actions/cache/lib/internal/cacheUtils'
import streamToPromise from 'stream-to-promise'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { getTempCachePath } from '../constants'
import { saveCache, ValidationError } from '@actions/cache'
import { GetCacheEntryDownloadURLRequest } from '@actions/cache/lib/generated/results/api/v1/cache'

function checkKey(key: string): void {
  if (key.length > 512) {
    throw new ValidationError(
      `Key Validation Error: ${key} cannot be larger than 512 characters.`
    )
  }
  const regex = /^[^,]*$/
  if (!regex.test(key)) {
    throw new ValidationError(
      `Key Validation Error: ${key} cannot contain commas.`
    )
  }
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

      await saveCache([tempFile], key)
      core.info(`Saved cache ${key}`)

      //* Remove the temporary file
      await unlink(tempFile)
    } catch (error) {
      handleFetchError('Unable to upload cache')(error)
    }
  }

  const query = async (
    key: string,
    path: string
  ): Promise<{
    success: boolean
    data?: { cacheKey: string; archiveLocation: string }
  }> => {
    const keys = [key]

    core.debug('Resolved Keys:')
    core.debug(JSON.stringify(keys))

    if (keys.length > 10) {
      throw new ValidationError(
        `Key Validation Error: Keys are limited to a maximum of 10.`
      )
    }
    for (const key of keys) {
      checkKey(key)
    }

    try {
      const twirpClient = cacheTwirpClient.internalCacheTwirpClient()
      const compressionMethod = await utils.getCompressionMethod()

      const request: GetCacheEntryDownloadURLRequest = {
        key,
        restoreKeys: [],
        version: utils.getCacheVersion([path], compressionMethod, false)
      }

      const response = await twirpClient.GetCacheEntryDownloadURL(request)

      if (!response.ok) {
        core.debug(
          `Cache not found for version ${request.version} of keys: ${keys.join(
            ', '
          )}`
        )
        return { success: true, data: undefined }
      }

      core.info(`Cache hit for: ${request.key}`)

      const url = response.signedDownloadUrl

      return { success: true, data: { cacheKey: key, archiveLocation: url } }
    } catch (error) {
      const typedError = error as Error
      if (typedError.name === ValidationError.name) {
        throw error
      } else {
        // Supress all non-validation cache related errors because caching should be optional
        core.warning(`Failed to restore: ${(error as Error).message}`)
      }
    }

    return { success: false, data: undefined }
  }

  return {
    save,
    query
  }
}
