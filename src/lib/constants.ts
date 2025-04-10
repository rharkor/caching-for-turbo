import * as core from '@actions/core'
import { join } from 'path'
import { env } from './env'

export const serverPort = 41230
export const cachePath = 'turbogha_v2'
export const cachePrefix = core.getInput('cache-prefix')
  ? `${core.getInput('cache-prefix')}-${cachePath}`
  : cachePath
export const getCacheKey = (hash: string, tag?: string): string =>
  `${cachePrefix}${hash}${tag ? `#${tag}` : ''}`
export const serverLogFile = env.RUNNER_TEMP
  ? join(env.RUNNER_TEMP, 'turbogha.log')
  : '/tmp/turbogha.log'
export const getFsCachePath = (hash: string): string =>
  join(env.RUNNER_TEMP || '/tmp', `${hash}.tg.bin`)
export const getTempCachePath = (key: string): string =>
  join(env.RUNNER_TEMP || '/tmp', `cache-${key}.tg.bin`)
