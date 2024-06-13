import { Readable } from 'node:stream'
import { env } from '../env'
import * as core from '@actions/core'
import streamToPromise from 'stream-to-promise'

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
  const baseURL = `${env.ACTIONS_CACHE_URL.replace(/\/$/, '')}/_apis/artifactcache`
  const headers = new Headers({
    Authorization: `Bearer ${env.ACTIONS_RUNTIME_TOKEN}`,
    Accept: 'application/json;api-version=6.0-preview.1'
  })

  const create = async (
    key: string,
    version: string
  ): Promise<{
    success: boolean
    data?: { cacheId: string }
  }> => {
    try {
      const res = await fetch(`${baseURL}/caches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, version })
      })
      if (!res.ok) {
        const { status, statusText } = res
        const data = await res.text()
        if (status === 409) {
          return { success: false }
        }
        const buildedError = new HandledError(status, statusText, data)
        return handleFetchError('Unable to reserve cache')(buildedError)
      }
      const data = await res.json()
      return { success: true, data }
    } catch (error) {
      return handleFetchError('Unable to reserve cache')(error)
    }
  }

  const upload = async (
    id: string,
    stream: Readable,
    size: number
  ): Promise<void> => {
    try {
      const body = await streamToPromise(stream)
      await fetch(`${baseURL}/caches/${id}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Length': size.toString(),
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes 0-${size - 1}/*`
        },
        body
      })
    } catch (error) {
      handleFetchError('Unable to upload cache')(error)
    }
  }

  const commit = async (id: string, size: number): Promise<void> => {
    try {
      await fetch(`${baseURL}/caches/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ size })
      })
    } catch (error) {
      handleFetchError('Unable to commit cache')(error)
    }
  }

  const query = async (
    keys: string,
    version: string
  ): Promise<{
    success: boolean
    data?: { cacheKey: string; archiveLocation: string }
  }> => {
    try {
      const params = new URLSearchParams({ keys, version })
      const res = await fetch(`${baseURL}/caches?${params}`, {
        method: 'GET',
        headers
      })
      if (!res.ok) {
        const { status, statusText } = res
        const data = await res.text()
        const buildedError = new HandledError(status, statusText, data)
        return handleFetchError('Unable to query cache')(buildedError)
      }
      const data = await res.json()
      return { success: true, data }
    } catch (error) {
      return handleFetchError('Unable to query cache')(error)
    }
  }

  return {
    create,
    upload,
    commit,
    query
  }
}
