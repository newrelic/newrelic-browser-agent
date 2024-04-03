const commonConfig = {
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/temp'],
  testEnvironment: 'jsdom',
  transform: {
    '\\.m?[jt]sx?$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tools/jest/matchers.mjs', '<rootDir>/tools/jest/globals.mjs'],
  unmockedModulePathPatterns: [
    '@faker-js/faker'
  ]
}

module.exports = {
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.component-test.js',
    '!src/index.js',
    '!src/cdn/**/*.js',
    '!src/features/*/index.js',
    '!src/features/*/constants.js',
    '!src/loaders/features/features.js'
  ],
  projects: [
    {
      ...commonConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/?(*.)+(test).[tj]s?(x)']
    },
    {
      ...commonConfig,
      displayName: 'component',
      testMatch: ['<rootDir>/tests/components/**/?(*.)+(test).[tj]s?(x)']
    }
  ]
}
