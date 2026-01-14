import parse from 'parse-duration'
import { core } from '../core'
import { getProvider } from '../providers'
import type { getTracker } from '../tracker'
import type { RequestContext } from '.'
import { parseFileSize } from './utils'

export type TListFile = {
  path: string
  createdAt: string
  size: number
}

export async function cleanup(
  ctx: RequestContext,
  tracker: ReturnType<typeof getTracker>
) {
  const maxAge = core.getInput('max-age') || process.env.MAX_AGE
  const maxFiles = core.getInput('max-files') || process.env.MAX_FILES
  const maxSize = core.getInput('max-size') || process.env.MAX_SIZE

  if (!maxAge && !maxFiles && !maxSize) {
    ctx.log.info('No cleanup options provided, skipping cleanup')
    return
  }

  const { maxAgeParsed, maxFilesParsed, maxSizeParsed } = {
    maxAgeParsed: maxAge ? parse(maxAge) : undefined,
    maxFilesParsed: maxFiles ? parseInt(maxFiles) : undefined,
    maxSizeParsed: maxSize ? parseFileSize(maxSize) : undefined
  }

  if (maxAge && !maxAgeParsed) {
    core.error('Invalid max-age provided')
    throw new Error('Invalid max-age provided')
  }

  if (maxFiles && !maxFilesParsed) {
    core.error('Invalid max-files provided')
    throw new Error('Invalid max-files provided')
  }

  if (maxSize && !maxSizeParsed) {
    core.error('Invalid max-size provided')
    throw new Error('Invalid max-size provided')
  }

  const provider = getProvider(tracker)

  if (provider.name === 'github') {
    console.warn(
      'Cleanup options are not available when using the GitHub provider, skipping cleanup'
    )
    return
  }

  let files: TListFile[] = []
  try {
    files = await provider.list()
  } catch (e) {
    const msg = `Provider does not support listing: ${(e as Error).message}
Exiting early, no files were cleaned up.`
    ctx.log.info(msg)
    return
  }

  const fileToDelete: (TListFile & {
    reason: 'max-age' | 'max-files' | 'max-size'
  })[] = []
  if (maxAgeParsed) {
    const now = new Date()
    const age = new Date(now.getTime() - maxAgeParsed)
    fileToDelete.push(
      ...files
        .filter(file => new Date(file.createdAt) < age)
        .map(file => ({ ...file, reason: 'max-age' as const }))
    )
  }

  if (maxFilesParsed && files.length > maxFilesParsed) {
    const sortedByDate = [...files].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const excessFiles = sortedByDate.slice(0, files.length - maxFilesParsed)
    excessFiles.forEach(file => {
      if (!fileToDelete.some(f => f.path === file.path)) {
        fileToDelete.push({ ...file, reason: 'max-files' })
      }
    })
  }

  if (maxSizeParsed) {
    let totalSize = files.reduce((sum, file) => sum + file.size, 0)

    if (totalSize > maxSizeParsed) {
      const sortedByDate = [...files].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      for (const file of sortedByDate) {
        if (totalSize <= maxSizeParsed) break

        if (!fileToDelete.some(f => f.path === file.path)) {
          fileToDelete.push({ ...file, reason: 'max-size' })
          totalSize -= file.size
        }
      }
    }
  }

  if (fileToDelete.length > 0) {
    ctx.log.info(
      `Cleaning up ${fileToDelete.length} files (${fileToDelete.map(
        f => `${f.path} (${f.reason})`
      )})`
    )
    for (const file of fileToDelete) {
      try {
        await provider.delete(file.path)
        ctx.log.info(`Deleted ${file}`)
      } catch (error) {
        core.error(`Failed to delete ${file.path}: ${error}`)
      }
    }
  } else {
    ctx.log.info('No files to clean up')
  }
}
