import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@actions/cache$': '<rootDir>/__tests__/mocks/actions-cache.ts'
  }
}

export default config
