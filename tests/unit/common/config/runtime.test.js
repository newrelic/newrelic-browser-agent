let mergeRuntime
beforeEach(async () => {
  jest.resetModules()
  ;({ mergeRuntime } = await import('../../../../src/common/config/runtime.js'))
})

test('mergeRuntime should respect readonly properties', () => {
  const returnedRuntime = mergeRuntime({
    buildEnv: 'foo',
    distMethod: 'bar',
    version: 'biz',
    originTime: 'baz'
  })
  expect(returnedRuntime.buildEnv).toEqual('NPM')
  expect(returnedRuntime.distMethod).toEqual('NPM')
  expect(returnedRuntime.version).toEqual(expect.any(String))
  expect(returnedRuntime.version).not.toEqual('biz')
  expect(returnedRuntime.originTime).toEqual(expect.any(Number))
  expect(returnedRuntime.originTime).not.toEqual('baz')
})

test('accessing harvestCount should increment it', () => {
  const returnedRuntime = mergeRuntime({
    buildEnv: 'foo',
    distMethod: 'bar',
    version: 'biz',
    originTime: 'baz'
  })

  expect(returnedRuntime.harvestCount).not.toEqual(returnedRuntime.harvestCount)
})
