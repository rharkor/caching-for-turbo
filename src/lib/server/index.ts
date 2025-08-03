import Fastify from 'fastify'
import { serverPort } from '../constants'
import { cleanup } from './cleanup'
import { getProvider } from '../providers'
import { Readable } from 'stream'
import { env } from '../env'
import { getTracker } from '../tracker'

export type RequestContext = {
  log: {
    info: (message: string) => void
  }
}

export async function server(): Promise<void> {
  const tracker = getTracker()

  //* Create the server
  const fastify = Fastify({
    logger: env.LOG_LEVEL === 'debug' ? true : false
  })

  //? Server status check
  fastify.get('/', async () => {
    return { ok: true }
  })

  //? Ping endpoint to test cache provider functionality
  fastify.get('/ping', async request => {
    request.log.info(
      'Ping endpoint called - testing cache provider functionality'
    )

    try {
      const tests = []
      const provider = getProvider(tracker)
      const testHash = 'ping-test-file'
      const testContent = 'This is a test file for ping functionality'

      // Create a readable stream from the test content
      const testStream = new Readable()
      testStream.push(testContent)
      testStream.push(null) // End the stream

      // Test 1: Upload a test file
      request.log.info('Testing cache upload...')
      await provider.save(request, testHash, 'ping-test', testStream)
      request.log.info('Cache upload test successful')
      tests.push('upload')

      // Test 2: Retrieve the test file
      request.log.info('Testing cache retrieval...')
      const result = await provider.get(request, testHash)
      if (!result) {
        throw new Error('Failed to retrieve test file from cache')
      }
      request.log.info('Cache retrieval test successful')
      tests.push('retrieve')

      // Test 3: Delete the test file (only if supported)
      try {
        request.log.info('Testing cache deletion...')
        await provider.delete(testHash)
        request.log.info('Cache deletion test successful')
        tests.push('delete')
      } catch (deleteError) {
        request.log.info(
          `Cache deletion not supported or failed: ${deleteError}`
        )
        // Don't fail the ping test if deletion is not supported
      }

      return {
        ok: true,
        message: 'Cache provider functionality test completed successfully',
        tests
      }
    } catch (error) {
      request.log.error(`Ping test failed: ${error}`)
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  //? Shut down the server
  const shutdown = async (ctx: RequestContext) => {
    //* Handle cleanup
    await cleanup(ctx, tracker)

    //* Print tracker
    const total = tracker.save + tracker.get + tracker.delete + tracker.list
    console.log('Average time taken:', {
      save: `${tracker.save}ms (${Math.round((tracker.save / Math.max(total, 1)) * 100)}%)`,
      get: `${tracker.get}ms (${Math.round((tracker.get / Math.max(total, 1)) * 100)}%)`,
      delete: `${tracker.delete}ms (${Math.round((tracker.delete / Math.max(total, 1)) * 100)}%)`,
      list: `${tracker.list}ms (${Math.round((tracker.list / Math.max(total, 1)) * 100)}%)`
    })

    // Exit the server after responding (100ms)
    setTimeout(() => process.exit(0), 100)
    return { ok: true }
  }
  fastify.delete('/shutdown', async request => {
    return shutdown(request)
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
    const provider = getProvider(tracker)
    await provider.save(
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
    const provider = getProvider(tracker)
    const result = await provider.get(request, hash)
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

  /**
   *  Login and link commands
   */

  fastify.get('/v5/user/tokens/current', async () => {
    return {
      ok: true,
      token: {
        id: 'turbogha',
        name: 'turbogha',
        type: 'turbogha',
        origin: 'turbogha',
        scopes: [],
        activeAt: Date.now(),
        createdAt: Date.now()
      }
    }
  })

  fastify.get('/v8/artifacts/status', async () => {
    return {
      ok: true,
      status: 'enabled'
    }
  })

  fastify.get('/v2/user', async () => {
    return {
      ok: true,
      user: {
        id: 'turbogha',
        username: 'turbogha',
        email: 'turbogha@turbogha.com',
        name: 'turbogha',
        createdAt: Date.now()
      }
    }
  })

  fastify.get('/v2/teams', async () => {
    return {
      ok: true,
      teams: [
        {
          id: 'turbogha',
          slug: 'turbogha',
          name: 'turbogha',
          createdAt: Date.now(),
          created: new Date(),
          membership: {
            role: 'OWNER'
          }
        }
      ]
    }
  })

  //* Start the server
  await fastify.listen({ port: serverPort })
}
