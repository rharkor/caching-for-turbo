const core = require('@actions/core')
const { readFile } = require('fs/promises')

const serverPort = 41230
const serverLogFile = '/tmp/turbogha.log'

/**
 * The post function of the action. It kills the server
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    //* Kill the server
    await fetch(`http://localhost:${serverPort}/shutdown`, {
      method: 'DELETE'
    })

    //* Read the logs
    const logs = await readFile(serverLogFile, 'utf-8')
    console.log(logs)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
