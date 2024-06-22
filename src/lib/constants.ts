import * as core from '@actions/core'
import { join } from 'path'
import { env } from './env'

export const serverPort = 41230
export const cacheVersion = 'turbogha_v2'
export const cachePrefix = core.getInput('cache-prefix') || 'turbogha_'
export const getCacheKey = (hash: string, tag?: string): string =>
  `${cachePrefix}${hash}${tag ? `#${tag}` : ''}`
export const serverLogFile = env.RUNNER_TEMP
  ? join(env.RUNNER_TEMP, 'turbogha.log')
  : '/tmp/turbogha.log'
