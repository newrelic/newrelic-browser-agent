import * as env from './env.cdn'

test('should default environment variables to CDN values', async () => {
  expect(env.VERSION).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}/)
  expect(env.BUILD_ENV).toEqual('CDN')
  expect(env.DIST_METHOD).toEqual('CDN')
})
