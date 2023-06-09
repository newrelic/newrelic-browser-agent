import * as env from './env'

test('should default environment variables to NPM values', () => {
  expect(env.VERSION).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}/)
  expect(env.BUILD_ENV).toEqual('NPM')
  expect(env.DIST_METHOD).toEqual('NPM')
})
