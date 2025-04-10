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
import { getCacheKey } from 'src/lib/constants'

export const getS3Provider = (): TProvider => {
  const s3AccessKeyId =
    core.getInput('s3-access-key-id') || process.env.S3_ACCESS_KEY_ID
  const s3SecretAccessKey =
    core.getInput('s3-secret-access-key') || process.env.S3_SECRET_ACCESS_KEY
  const s3Bucket = core.getInput('s3-bucket') || process.env.S3_BUCKET
  const s3Region = core.getInput('s3-region') || process.env.S3_REGION
  const s3Endpoint = core.getInput('s3-endpoint') || process.env.S3_ENDPOINT
  const s3Prefix =
    core.getInput('s3-prefix') || process.env.S3_PREFIX || 'turbogha/'

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

  const getS3Key = (hash: string, tag?: string) => {
    const key = getCacheKey(hash, tag)
    if (s3Prefix) {
      return `${s3Prefix}${key}`
    }
    return key
  }

  const save = async (
    ctx: RequestContext,
    hash: string,
    tag: string,
    stream: Readable
  ): Promise<void> => {
    const objectKey = getS3Key(hash, tag)
    console.log({ objectKey, s3Prefix })

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
    const objectKey = getS3Key(hash)

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

  const deleteObj = async (key: string): Promise<void> => {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: key
      })

      await s3Client.send(deleteCommand)
    } catch (error) {
      core.error(`Error deleting artifact from S3: ${error}`)
      throw error
    }
  }

  const list = async (): Promise<TListFile[]> => {
    try {
      const files: TListFile[] = []
      let continuationToken: string | undefined

      do {
        // Create a new command for each request with the current continuation token
        const listCommand = new ListObjectsV2Command({
          Bucket: s3Bucket,
          Prefix: s3Prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        })

        core.debug(
          `Listing S3 objects with prefix ${s3Prefix}${continuationToken ? ' and continuation token' : ''}`
        )

        const response = await s3Client.send(listCommand)

        if (response.Contents && response.Contents.length > 0) {
          core.debug(`Found ${response.Contents.length} objects`)

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
        if (continuationToken) {
          core.debug(`NextContinuationToken: ${continuationToken}`)
        }
      } while (continuationToken)

      core.debug(`Total files listed: ${files.length}`)
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
