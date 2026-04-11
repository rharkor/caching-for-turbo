import { config } from 'dotenv'
config()

import { cleanup } from '@/lib/server/cleanup'
import { getTracker } from '@/lib/tracker'

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
