// Run the server in foreground and kill it after the test

import { server } from './lib/server'
import { launchServer } from './lib/server/utils'

const main = async (): Promise<void> => {
  //* Run server
  server()
  //* Run launch server
  await launchServer(true)
}

main()
