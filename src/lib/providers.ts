import * as core from '@actions/core'
import { Readable } from 'stream'
import { TListFile } from './server/cleanup'
import { RequestContext } from './server'
import { getGithubProvider } from './providers/cache'
import { getS3Provider } from './providers/s3'
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

export const getProvider = (): TProvider => {
  const provider = core.getInput('provider') || process.env.PROVIDER

  if (!provider) {
    throw new Error('Provider is required')
  }

  if (provider === 'github') {
    return getGithubProvider()
  }
  if (provider === 's3') {
    return getS3Provider()
  }

  throw new Error(`Provider ${provider} not supported`)
}
