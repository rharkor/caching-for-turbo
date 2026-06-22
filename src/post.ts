import { readFile } from 'fs/promises'
import { serverLogFile } from './lib/constants'
import { core } from './lib/core'
import { readActualPort } from './lib/server/utils'
import { cleanupWorkspaceCache } from './lib/workspace'

/**
 * The out script for the action.
 */
async function post(): Promise<void> {
  try {
    //* Read the actual port (supports port 0 auto-assignment)
    //* Short timeout: in post hook the port file either exists already or never will
    const actualPort = readActualPort(500)

    //* Kill the server
    await fetch(`http://localhost:${actualPort}/shutdown`, {
      method: 'DELETE'
    })

    //* Read the logs
    const logs = await readFile(serverLogFile, 'utf-8')
    //* Print the logs
    core.info(logs)

    //* Remove restored cache artifacts from the workspace checkout
    await cleanupWorkspaceCache()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// Run the out script
post()
