module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[tj]s?(x)'],
  transform: {
    '\\.m?[jt]sx?$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tools/jest-matchers/index.mjs']
}
