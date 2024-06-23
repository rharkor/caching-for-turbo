import * as core from '@actions/core'
import { readFile } from 'fs/promises'
import { serverLogFile, serverPort } from './lib/constants'

/**
 * The out script for the action.
 */
async function post(): Promise<void> {
  try {
    //* Kill the server
    await fetch(`http://localhost:${serverPort}/shutdown`, {
      method: 'DELETE'
    })

    //* Read the logs
    const logs = await readFile(serverLogFile, 'utf-8')
    //* Print the logs
    core.info(logs)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// Run the out script
post()
