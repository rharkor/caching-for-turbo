import * as core from '@actions/core'

export const serverPort = 41230
export const cacheVersion = 'turbogha_v2'
export const cachePrefix = core.getInput('cache-prefix') || 'turbogha_'
export const getCacheKey = (hash: string, tag?: string): string =>
  `${cachePrefix}${hash}${tag ? `#${tag}` : ''}`
export const serverLogFile = '/tmp/turbogha.log'
