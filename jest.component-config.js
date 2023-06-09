module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/cdn/**/*.js',
    '!src/features/*/index.js',
    '!src/features/*/constants.js',
    '!src/loaders/features/features.js'
  ],
  modulePathIgnorePatterns: ['<rootDir>/temp'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/?(*.)+(component-test).[tj]s?(x)'],
  transform: {
    '\\.m?[jt]sx?$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tools/jest-matchers/index.mjs'],
  unmockedModulePathPatterns: [
    '@faker-js/faker'
  ]
}
