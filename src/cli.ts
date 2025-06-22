#!/usr/bin/env node

import { config } from 'dotenv'
import { server } from './lib/server'
import { killServer, launchServer } from './lib/server/utils'
import { logger } from '@rharkor/logger'
import { ping } from './lib/ping'
import { serverLogFile } from './lib/constants'
import { writeFile } from 'fs/promises'
import { version } from '../package.json'

// Load environment variables from .env file if it exists
config()

const main = async (): Promise<void> => {
  await logger.init()

  const args = process.argv.slice(2)
  const command = args[0]

  const help = `
Turborepo GitHub Actions Cache Server

Usage:
  turbogha <command> [options]

Commands:
  start             Start the cache server (default: background mode)
  start --foreground Start the cache server in foreground mode
  kill              Kill the running server
  ping              Ping the server to check if it's running
  help              Show this help message
  version           Show version

Environment Variables:
  The following environment variables are supported for S3 configuration:
  - S3_ACCESS_KEY_ID: AWS S3 access key ID
  - S3_SECRET_ACCESS_KEY: AWS S3 secret access key  
  - S3_BUCKET: AWS S3 bucket name
  - S3_REGION: AWS S3 region
  - S3_ENDPOINT: S3 endpoint (default: https://s3.amazonaws.com)
  - S3_PREFIX: Prefix for S3 objects (default: turbogha/)
  - PROVIDER: Cache provider (github or s3)

Examples:
  # Start server in background and export environment variables
  turbogha start

  # Start server in foreground mode
  turbogha start --foreground

  # Ping the server
  turbogha ping

  # Kill the server
  turbogha kill

  # With S3 configuration
  S3_ACCESS_KEY_ID=your-key S3_SECRET_ACCESS_KEY=your-secret S3_BUCKET=your-bucket S3_REGION=us-east-1 turbogha start
`

  if (
    !command ||
    command === '--help' ||
    command === '-h' ||
    command === 'help'
  ) {
    console.log(help)
    process.exit(0)
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(version)
    process.exit(0)
  }

  const startForeground = async () => {
    // Empty log file
    await writeFile(serverLogFile, '', { flag: 'w' })
    // Run server in foreground mode
    console.log('Starting Turborepo cache server in foreground mode...')
    await server()
  }
  if (command === '--server') {
    await startForeground()
    return
  }

  try {
    switch (command) {
      case 'ping':
        await ping()
        break

      case 'kill':
        await killServer()
        break

      case 'start': {
        const isForeground = args.includes('--foreground')

        if (isForeground) {
          await startForeground()
        } else {
          // Run server in background mode and export environment variables
          console.log('Starting Turborepo cache server...')
          // Empty log file
          await writeFile(serverLogFile, '', { flag: 'w' })
          await launchServer()
          console.log(
            '\nServer is running! You can now use Turbo with remote caching.'
          )
          console.log('\nTo stop the server, run:')
          console.log('turbogha kill')
        }
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        console.log(help)
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
