import { TProvider } from 'src/lib/providers'
import * as core from '@actions/core'
import { Readable } from 'stream'
import { RequestContext } from '../../server'
import { TListFile } from '../../server/cleanup'
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

export const getS3Provider = (): TProvider => {
  const s3AccessKeyId = core.getInput('s3-access-key-id')
  const s3SecretAccessKey = core.getInput('s3-secret-access-key')
  const s3Bucket = core.getInput('s3-bucket')
  const s3Region = core.getInput('s3-region')
  const s3Endpoint = core.getInput('s3-endpoint')
  const s3Prefix = core.getInput('s3-prefix') || 'turbogha/'

  if (
    !s3AccessKeyId ||
    !s3SecretAccessKey ||
    !s3Bucket ||
    !s3Region ||
    !s3Endpoint
  ) {
    throw new Error(
      'S3 provider requires s3-access-key-id, s3-secret-access-key, s3-bucket, s3-region, and s3-endpoint inputs'
    )
  }

  const s3Client = new S3Client({
    region: s3Region,
    endpoint: s3Endpoint,
    credentials: {
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey
    }
  })

  const getObjectKey = (hash: string, tag?: string): string => {
    if (tag) {
      return `${s3Prefix}${hash}#${tag}`
    }
    return `${s3Prefix}${hash}`
  }

  const save = async (
    ctx: RequestContext,
    hash: string,
    tag: string,
    stream: Readable
  ): Promise<void> => {
    const objectKey = getObjectKey(hash, tag)

    try {
      // Use the S3 Upload utility which handles multipart uploads for large files
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: s3Bucket,
          Key: objectKey,
          Body: stream,
          ContentType: 'application/octet-stream'
        }
      })

      await upload.done()
      ctx.log.info(`Saved artifact to S3: ${objectKey}`)
    } catch (error) {
      ctx.log.info(`Error saving artifact to S3: ${error}`)
      throw error
    }
  }

  const get = async (
    ctx: RequestContext,
    hash: string
  ): Promise<
    [number | undefined, Readable | ReadableStream, string | undefined] | null
  > => {
    // First try to get with just the hash
    const objectKey = getObjectKey(hash)

    try {
      // Try to find the object
      const listCommand = new ListObjectsV2Command({
        Bucket: s3Bucket,
        Prefix: objectKey,
        MaxKeys: 10
      })

      const listResponse = await s3Client.send(listCommand)

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        ctx.log.info(`No cached artifact found for ${hash}`)
        return null
      }

      // Find the most recent object that matches the hash prefix
      const matchingObjects = listResponse.Contents.filter(
        obj => obj.Key && obj.Key.startsWith(objectKey)
      )

      if (matchingObjects.length === 0) {
        return null
      }

      // Sort by last modified date, newest first
      matchingObjects.sort((a, b) => {
        const dateA = a.LastModified?.getTime() || 0
        const dateB = b.LastModified?.getTime() || 0
        return dateB - dateA
      })

      const latestObject = matchingObjects[0]
      const key = latestObject.Key as string

      // Get the object
      const getCommand = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: key
      })

      const response = await s3Client.send(getCommand)

      if (!response.Body) {
        ctx.log.info(`Failed to get artifact body from S3`)
        return null
      }

      const size = response.ContentLength
      const stream = response.Body as Readable

      // Extract the tag if it exists
      let artifactTag: string | undefined
      if (key.includes('#')) {
        const parts = key.split('#')
        artifactTag = parts[parts.length - 1]
      }

      ctx.log.info(`Retrieved artifact from S3: ${key}`)
      return [size, stream, artifactTag]
    } catch (error) {
      ctx.log.info(`Error getting artifact from S3: ${error}`)
      return null
    }
  }

  const deleteObj = async (hash: string): Promise<void> => {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: hash.startsWith(s3Prefix) ? hash : getObjectKey(hash)
      })

      await s3Client.send(deleteCommand)
    } catch (error) {
      core.error(`Error deleting artifact from S3: ${error}`)
      throw error
    }
  }

  const list = async (): Promise<TListFile[]> => {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: s3Bucket,
        Prefix: s3Prefix
      })

      const files: TListFile[] = []
      let continuationToken: string | undefined

      do {
        if (continuationToken) {
          listCommand.input.ContinuationToken = continuationToken
        }

        const response = await s3Client.send(listCommand)

        if (response.Contents) {
          const objects = response.Contents.filter(obj => obj.Key).map(
            (obj): TListFile => {
              return {
                path: obj.Key as string,
                createdAt: (obj.LastModified || new Date()).toISOString(),
                size: obj.Size || 0
              }
            }
          )

          files.push(...objects)
        }

        continuationToken = response.NextContinuationToken
      } while (continuationToken)

      return files
    } catch (error) {
      core.error(`Error listing artifacts from S3: ${error}`)
      throw error
    }
  }

  return {
    save,
    get,
    delete: deleteObj,
    list
  }
}
