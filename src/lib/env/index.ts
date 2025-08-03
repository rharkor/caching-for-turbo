const envObject = {
  ACTIONS_RUNTIME_TOKEN: process.env.ACTIONS_RUNTIME_TOKEN,
  ACTIONS_CACHE_URL: process.env.ACTIONS_CACHE_URL,
  RUNNER_TEMP: process.env.RUNNER_TEMP,
  LOG_LEVEL: process.env.LOG_LEVEL
}

type TInvalidEnv = {
  valid: false
} & typeof envObject

type TValidEnv = {
  valid: true
} & {
  [K in keyof typeof envObject]: NonNullable<(typeof envObject)[K]>
}

type TEnv = TInvalidEnv | TValidEnv

export const env = {
  valid: Object.values(envObject).every(value => value !== undefined),
  ...envObject
} as TEnv
