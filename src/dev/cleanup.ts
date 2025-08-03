import { config } from 'dotenv'
config()

import { cleanup } from 'src/lib/server/cleanup'
import { getTracker } from 'src/lib/tracker'

const main = async () => {
  await cleanup(
    {
      log: {
        info: console.log
      }
    },
    getTracker()
  )
}

main()
