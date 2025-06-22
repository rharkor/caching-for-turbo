import * as coreLib from '@actions/core'
import { logger as loggerLib } from '@rharkor/logger'

const isCI = process.env.CI === 'true'

export const core = {
  isCI,
  setFailed: (message: string) => {
    if (isCI) {
      coreLib.setFailed(message)
    } else {
      loggerLib.error(message)
    }
  },
  getInput: (name: string) => {
    if (isCI) {
      return coreLib.getInput(name)
    }
    return undefined
  },
  exportVariable: (name: string, value: string) => {
    if (isCI) {
      coreLib.exportVariable(name, value)
    }
  },
  //* Logger
  info: (message: string) => {
    if (isCI) {
      coreLib.info(message)
    } else {
      loggerLib.info(message)
    }
  },
  error: (message: string) => {
    if (isCI) {
      coreLib.error(message)
    } else {
      loggerLib.error(message)
    }
  },
  debug: (message: string) => {
    if (isCI) {
      coreLib.debug(message)
    } else {
      loggerLib.debug(message)
    }
  },
  log: (message: string) => {
    if (isCI) {
      coreLib.info(message)
    } else {
      loggerLib.log(message)
    }
  },
  success: (message: string) => {
    if (isCI) {
      coreLib.info(message)
    } else {
      loggerLib.success(message)
    }
  }
}
