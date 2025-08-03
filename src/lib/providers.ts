import { Readable } from 'stream'
import { TListFile } from './server/cleanup'
import { RequestContext } from './server'
import { getGithubProvider } from './providers/cache'
import { getS3Provider } from './providers/s3'
import { core } from './core'
import { getTracker } from './tracker'

export type TProvider = {
  save: (
    ctx: RequestContext,
    hash: string,
    tag: string,
    stream: Readable
  ) => Promise<void>
  get: (
    ctx: RequestContext,
    hash: string
  ) => Promise<
    [number | undefined, Readable | ReadableStream, string | undefined] | null
  >
  delete: (key: string) => Promise<void>
  list: () => Promise<TListFile[]>
}

export const getProvider = (
  tracker: ReturnType<typeof getTracker>
): TProvider => {
  const provider = core.getInput('provider') || process.env.PROVIDER

  if (!provider) {
    throw new Error(
      'Provider is required. Set PROVIDER environment variable or provider input.'
    )
  }

  if (provider === 'github') {
    return getGithubProvider(tracker)
  }
  if (provider === 's3') {
    return getS3Provider(tracker)
  }

  throw new Error(`Provider ${provider} not supported`)
}
