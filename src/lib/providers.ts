import * as core from '@actions/core'
import { getGithubProvider } from './cache/utils'
import { Readable } from 'stream'
import { TListFile } from './server/cleanup'

export type TProvider = {
  save: (key: string, stream: Readable) => Promise<void>
  restore: (path: string, key: string) => Promise<string | undefined>
  delete: () => Promise<void>
  list: () => Promise<TListFile[]>
}

export const getProvider = (): TProvider => {
  const provider = core.getInput('provider')
  if (provider === 'github') {
    return getGithubProvider()
  }

  throw new Error(`Provider ${provider} not supported`)
}
