import { join } from 'path'
import { env } from './env'
import { core } from './core'

// Helper function to get input value, prioritizing environment variables for local development
const getInput = (name: string, envName?: string): string | undefined => {
  // In GitHub Actions context, try core.getInput first
  if (process.env.CI === 'true') {
    const coreInput = core.getInput(name)
    if (coreInput) return coreInput
  }

  // Fall back to environment variable
  const envVar = envName || name.toUpperCase().replace(/-/g, '_')
  return process.env[envVar]
}

export const serverPort = 41230
export const cachePath = 'turbogha_'
export const cachePrefix = getInput('cache-prefix', 'CACHE_PREFIX') || cachePath
export const getCacheKey = (hash: string, tag?: string): string =>
  `${cachePrefix}${hash}${tag ? `#${tag}` : ''}`
export const serverLogFile = env.RUNNER_TEMP
  ? join(env.RUNNER_TEMP, 'turbogha.log')
  : '/tmp/turbogha.log'
export const getFsCachePath = (hash: string): string =>
  join(env.RUNNER_TEMP || '/tmp', `${hash}.tg.bin`)
export const getTempCachePath = (key: string): string =>
  join(env.RUNNER_TEMP || '/tmp', `cache-${key}.tg.bin`)
