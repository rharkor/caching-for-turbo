import { core } from './core'
import { serverPort } from './constants'

export const ping = async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      core.error('Cache provider test timed out')
      controller.abort()
    }, 15000)

    const response = await fetch(`http://localhost:${serverPort}/ping`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const result = await response.json()

    if (result.ok) {
      core.success('Cache provider functionality test completed successfully')
      core.info(`Tests performed: ${result.tests.join(', ')}`)
    } else {
      core.error(`Cache provider test failed: ${result.error}`)
      throw new Error(result.error)
    }
  } catch (error) {
    core.error(`Failed to test cache provider: ${error}`)
    throw error
  }
}
