import { core } from './core'
import { waitForServer } from './server/utils'

export const ping = async () => {
  await waitForServer()
  core.success('Server is up and running')
}
