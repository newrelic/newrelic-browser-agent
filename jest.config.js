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
    '\\.[jt]sx?$': 'babel-jest'
  }
}
