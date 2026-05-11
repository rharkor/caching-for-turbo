import { spawn, spawnSync } from 'child_process'
import { existsSync, openSync, readFileSync, rmSync } from 'fs'
import waitOn from 'wait-on'
import {
  cachePath,
  cachePrefix,
  serverLogFile,
  serverPort,
  serverPortFile
} from '../constants'
import { core } from '../core'

/**
 * Poll for the actual port from the port file. When port 0 is configured,
 * the OS assigns an ephemeral port and the server writes it to a port file
 * after binding. This function polls for that file with a short timeout.
 *
 * Accepts explicit overrides for testability; defaults to module-level constants.
 */
export const readActualPort = (
  timeoutMs = 5000,
  portOverride?: number,
  portFileOverride?: string
): number => {
  const port_ = portOverride ?? serverPort
  const file_ = portFileOverride ?? serverPortFile
  if (port_ !== 0) return port_
  const deadline = Date.now() + timeoutMs
  const interval = 50
  while (Date.now() < deadline) {
    if (existsSync(file_)) {
      const raw = readFileSync(file_, 'utf-8').trim()
      const port = parseInt(raw, 10)
      if (!isNaN(port) && port > 0) return port
    }
    // Synchronous sleep — we're in a setup-phase spin-wait, not on a hot path.
    // spawnSync is cheap and yields the CPU unlike a busy-wait loop.
    spawnSync('sleep', ['0.05'])
  }
  throw new Error(
    `Timed out waiting for server to write its port to ${file_}`
  )
}

export const waitForServer = async (port?: number): Promise<void> => {
  const effectivePort = port ?? serverPort
  await waitOn({
    resources: [`http-get://localhost:${effectivePort}`],
    timeout: 5000
  }).catch(e => {
    core.error(
      `Timed out waiting for cache server on port ${effectivePort}. ` +
        `This often means the server failed to start — check the logs below for EADDRINUSE or other binding errors. ` +
        `If the port is already in use, set server-port to 0 for automatic port assignment.`
    )
    // Surface the server log file for diagnosis
    try {
      const logs = readFileSync(serverLogFile, 'utf-8')
      core.error(`Server logs (${serverLogFile}):\n${logs}`)
    } catch {
      core.error(
        `Server log file not found at ${serverLogFile} — the server process may not have started`
      )
    }
    throw e
  })
}

export const exportVariable = (name: string, value: string): void => {
  core.exportVariable(name, value)
  core.log(`  ${name}=${value}`)
}

export async function launchServer(devRun?: boolean): Promise<void> {
  //* Remove stale port file from a previous invocation
  try {
    rmSync(serverPortFile, { force: true })
  } catch {
    // ignore — file may not exist
  }

  if (!devRun) {
    //* Launch a detached child process to run the server
    // See: https://nodejs.org/docs/latest-v16.x/api/child_process.html#optionsdetached
    const out = openSync(serverLogFile, 'a')
    const err = openSync(serverLogFile, 'a')
    const child = spawn(process.argv[0], [process.argv[1], '--server'], {
      detached: true,
      stdio: ['ignore', out, err]
    })
    child.unref()
    core.log(`Cache version: ${cachePath}`)
    core.log(`Cache prefix: ${cachePrefix}`)
    core.log(`Launched child process: ${child.pid}`)
    core.log(`Server log file: ${serverLogFile}`)
  }

  //* Resolve the actual port (reads port file when port 0 was requested)
  const actualPort = readActualPort()

  //* Wait for server
  await waitForServer(actualPort)
  core.info(`Server is now up and running on port ${actualPort}.`)

  //* Export the environment variables for Turbo
  if (devRun) {
    console.log('Execute:')
    console.log(`export TURBOGHA_PORT=${actualPort}`)
    console.log(`export TURBO_API=http://localhost:${actualPort}`)
    console.log(`export TURBO_TOKEN=turbogha`)
    console.log(`export TURBO_TEAM=turbogha`)
  } else {
    if (core.isCI) {
      core.info('The following environment variables are exported:')
    } else {
      core.info(
        'You need to use the following environment variables for turbo to work:'
      )
    }
    exportVariable('TURBOGHA_PORT', `${actualPort}`)
    exportVariable('TURBO_API', `http://localhost:${actualPort}`)
    exportVariable('TURBO_TOKEN', 'turbogha')
    exportVariable('TURBO_TEAM', 'turbogha')
  }
}

export async function killServer() {
  //* Kill the server
  const actualPort = readActualPort(500)
  await fetch(`http://localhost:${actualPort}/shutdown`, {
    method: 'DELETE'
  })
  //* Clean up the port file
  try {
    rmSync(serverPortFile, { force: true })
  } catch {
    // ignore — best-effort cleanup
  }
}

export const parseFileSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024
  }

  const match = size.toLowerCase().match(/^(\d+)\s*([a-z]+)$/)
  if (!match) {
    throw new Error(`Invalid file size format: ${size}`)
  }

  const [, value, unit] = match
  const multiplier = units[unit]

  if (!multiplier) {
    throw new Error(`Invalid file size unit: ${unit}`)
  }

  return parseInt(value) * multiplier
}
