import * as core from '@actions/core'
import { RequestContext } from '.'
import parse from 'parse-duration'
import { getProvider } from '../providers'

export type TListFile = {
  path: string
  createdAt: string
  size: number
}

export async function cleanup(ctx: RequestContext) {
  const maxAge = core.getInput('max-age')
  const maxFiles = core.getInput('max-files')
  const maxSize = core.getInput('max-size')

  if (!maxAge && !maxFiles && !maxSize) {
    ctx.log.info('No cleanup options provided, skipping cleanup')
    return
  }

  const { maxAgeParsed, maxFilesParsed, maxSizeParsed } = {
    maxAgeParsed: parse(maxAge),
    maxFilesParsed: parseInt(maxFiles),
    maxSizeParsed: parseInt(maxSize)
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

  const provider = getProvider()

  const files = await provider.list()

  ctx.log.info(`Found ${files.length} files in cache`)
  core.info(JSON.stringify(files, null, 2))

  const fileToDelete: TListFile[] = []
  if (maxAgeParsed) {
    const now = new Date()
    const age = new Date(now.getTime() - maxAgeParsed)
    fileToDelete.push(...files.filter(file => new Date(file.createdAt) < age))
  }

  if (maxFilesParsed && files.length > maxFilesParsed) {
    const sortedByDate = [...files].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const excessFiles = sortedByDate.slice(0, files.length - maxFilesParsed)
    excessFiles.forEach(file => {
      if (!fileToDelete.some(f => f.path === file.path)) {
        fileToDelete.push(file)
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
          fileToDelete.push(file)
          totalSize -= file.size
        }
      }
    }
  }

  if (fileToDelete.length > 0) {
    ctx.log.info(`Cleaning up ${fileToDelete.length} files`)

    for (const file of fileToDelete) {
      try {
        await provider.delete(file.path)
        ctx.log.info(`Deleted ${file.path}`)
      } catch (error) {
        core.error(`Failed to delete ${file.path}: ${error}`)
      }
    }
  } else {
    ctx.log.info('No files to clean up')
  }
}
