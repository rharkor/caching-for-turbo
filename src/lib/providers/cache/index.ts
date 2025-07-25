import { Readable } from 'node:stream'
import { env } from '../../env'
import { pipeline } from 'node:stream/promises'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  statSync
} from 'node:fs'
import { getCacheKey, getFsCachePath, getTempCachePath } from '../../constants'
import { RequestContext } from '../../server'
import { TListFile } from '../../server/cleanup'
import { getCacheClient } from './utils'
import { TProvider } from '../../providers'
import { core } from 'src/lib/core'

//* Cache API
export async function saveCache(
  ctx: RequestContext,
  hash: string,
  tag: string,
  stream: Readable
): Promise<void> {
  if (!env.valid) {
    ctx.log.info(
      `Using filesystem cache because cache API env vars are not set`
    )
    await pipeline(stream, createWriteStream(getFsCachePath(hash)))
    return
  }
  const client = getCacheClient()
  const key = getCacheKey(hash, tag)
  await client.save(key, stream)
  ctx.log.info(`Saved cache ${key} for ${hash}`)
}

export async function getCache(
  ctx: RequestContext,
  hash: string
): Promise<
  [number | undefined, Readable | ReadableStream, string | undefined] | null
> {
  //* Get cache from filesystem if cache API env vars are not set
  if (!env.valid) {
    const path = getFsCachePath(hash)
    if (!existsSync(path)) return null
    const size = statSync(path).size
    return [size, createReadStream(path), undefined]
  }
  //* Get cache from cache API
  const client = getCacheClient()
  const cacheKey = getCacheKey(hash)
  const fileRestorationPath = getTempCachePath(cacheKey)
  const foundKey = await client.restore(fileRestorationPath, cacheKey)
  ctx.log.info(`Cache lookup for ${cacheKey}`)
  if (!foundKey) {
    ctx.log.info(`Cache lookup did not return data`)
    return null
  }
  const [foundCacheKey, artifactTag] = String(foundKey).split('#')
  if (foundCacheKey !== cacheKey) {
    ctx.log.info(`Cache key mismatch: ${foundCacheKey} !== ${cacheKey}`)
    return null
  }
  const size = statSync(fileRestorationPath).size
  const readableStream = createReadStream(fileRestorationPath)
  return [size, readableStream, artifactTag]
}

export async function deleteCache(): Promise<void> {
  core.error(`Cannot delete github cache automatically.`)
  throw new Error(`Cannot delete github cache automatically.`)
}

export async function listCache(): Promise<TListFile[]> {
  core.error(`Cannot list github cache automatically.`)
  throw new Error(`Cannot list github cache automatically.`)
}

export const getGithubProvider = (): TProvider => {
  return {
    save: saveCache,
    get: getCache,
    delete: deleteCache,
    list: listCache
  }
}
