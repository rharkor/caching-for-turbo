import { Readable } from 'node:stream'
import { env } from '../env'
import * as core from '@actions/core'
import * as cacheHttpClient from '@actions/cache/lib/internal/cacheHttpClient'
import streamToPromise from 'stream-to-promise'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { getTempCachePath } from '../constants'

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

  const reserve = async (
    key: string,
    path: string
  ): Promise<{
    success: boolean
    data?: { cacheId: number }
  }> => {
    try {
      const reserveCacheResponse = await cacheHttpClient.reserveCache(key, [
        path
      ])
      if (reserveCacheResponse?.result?.cacheId) {
        return {
          success: true,
          data: {
            cacheId: reserveCacheResponse.result.cacheId
          }
        }
      } else if (reserveCacheResponse?.statusCode === 409) {
        return { success: false }
      } else {
        const { statusCode, error } = reserveCacheResponse
        const buildedError = new HandledError(statusCode, error?.message || 'Unknown', reserveCacheResponse)
        return handleFetchError(`Unable to reserve cache (status: ${statusCode})`)(buildedError)
      }
    } catch (error) {
      return handleFetchError('Unable to reserve cache')(error)
    }
  }

  const save = async (id: number, stream: Readable): Promise<void> => {
    try {
      //* Create a temporary file to store the cache
      const tempFile = getTempCachePath(id)
      const writeStream = createWriteStream(tempFile)
      await streamToPromise(stream.pipe(writeStream))
      core.info(`Saved cache to ${tempFile}`)

      await cacheHttpClient.saveCache(id, tempFile)
      core.info(`Saved cache ${id}`)

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
    try {
      const queryCacheResponse = await cacheHttpClient.getCacheEntry(
        [key],
        [path]
      )
      if (queryCacheResponse?.archiveLocation) {
        return {
          success: true,
          data: {
            cacheKey: key,
            archiveLocation: queryCacheResponse.archiveLocation
          }
        }
      } else {
        return {
          success: false
        }
      }
    } catch (error) {
      return handleFetchError('Unable to query cache')(error)
    }
  }

  return {
    reserve,
    save,
    query
  }
}
