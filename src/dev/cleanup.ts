import { config } from 'dotenv'
config()

import { cleanup } from 'src/lib/server/cleanup'

const main = async () => {
  await cleanup({
    log: {
      info: console.log
    }
  })
}

main()
