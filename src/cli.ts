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

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Turborepo GitHub Actions Cache Server

Usage:
  turbogha [options]

Options:
  --server          Run the server in foreground mode
  --help, -h        Show this help message
  --version, -v     Show version
  --ping            Ping the server
  --kill            Kill the server

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
  # Run server in background and export environment variables
  turbogha

  # Run server in foreground mode
  turbogha --server

  # Ping the server
  turbogha --ping

  # With S3 configuration
  S3_ACCESS_KEY_ID=your-key S3_SECRET_ACCESS_KEY=your-secret S3_BUCKET=your-bucket S3_REGION=us-east-1 turbogha
`)
    process.exit(0)
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(version)
    process.exit(0)
  }

  try {
    if (args.includes('--ping')) {
      await ping()
    } else if (args.includes('--kill')) {
      await killServer()
    } else if (args.includes('--server')) {
      // Empty log file
      await writeFile(serverLogFile, '', { flag: 'w' })
      // Run server in foreground mode
      console.log('Starting Turborepo cache server in foreground mode...')
      await server()
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
      console.log('curl -X DELETE http://localhost:41230/shutdown')
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
