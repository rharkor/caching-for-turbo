import * as core from '@actions/core'
import { serverLogFile, serverPort } from './lib/constants'
import { readFile } from 'fs/promises'
import { killServer } from './lib/server/utils'

/**
 * The post function of the action. It kills the server
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await killServer()

    //* Read the logs
    const logs = await readFile(serverLogFile, 'utf-8')
    core.info(logs)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
