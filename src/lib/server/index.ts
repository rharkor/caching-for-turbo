import Fastify from 'fastify'
import { serverPort } from '../constants'
import { getCache, saveCache } from '../cache'
import cache from '@actions/cache'
import fs from 'fs/promises'

export async function server(): Promise<void> {
  //* Create the server
  const fastify = Fastify({
    logger: true
  })

  //! DEBUG try to insert cache
  try {
    console.log('DEBUG try to insert cache')
    await fs.writeFile('test.txt', 'test')
    await cache.saveCache(['test.txt'], 'test')
  } catch (error) {
    console.error(error)
  }

  //? Server status check
  fastify.get('/', async () => {
    return { ok: true }
  })

  //? Shut down the server
  const shutdown = () => {
    setTimeout(() => process.exit(0), 100)
    return { ok: true }
  }
  fastify.delete('/shutdown', async () => {
    return shutdown()
  })

  //? Handle streaming requets body
  // https://www.fastify.io/docs/latest/Reference/ContentTypeParser/#catch-all
  fastify.addContentTypeParser(
    'application/octet-stream',
    (_req, _payload, done) => {
      done(null)
    }
  )

  //? Upload cache
  fastify.put('/v8/artifacts/:hash', async request => {
    const hash = (request.params as { hash: string }).hash
    request.log.info(`Received artifact for ${hash}`)
    await saveCache(
      request,
      hash,
      String(request.headers['x-artifact-tag'] || ''),
      request.raw
    )
    request.log.info(`Saved artifact for ${hash}`)
    return { ok: true }
  })

  //? Download cache
  fastify.get('/v8/artifacts/:hash', async (request, reply) => {
    const hash = (request.params as { hash: string }).hash
    request.log.info(`Requested artifact for ${hash}`)
    const result = await getCache(request, hash)
    if (result === null) {
      request.log.info(`Artifact for ${hash} not found`)
      reply.code(404)
      return { ok: false }
    }
    const [size, stream, artifactTag] = result
    if (size) {
      reply.header('Content-Length', size)
    }
    reply.header('Content-Type', 'application/octet-stream')
    if (artifactTag) {
      reply.header('x-artifact-tag', artifactTag)
    }
    request.log.info(`Sending artifact for ${hash}`)
    return reply.send(stream)
  })

  //* Start the server
  await fastify.listen({ port: serverPort })
}
