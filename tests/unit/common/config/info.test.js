let isValid, mergeInfo
beforeEach(async () => {
  jest.resetModules()
  ;({ isValid, mergeInfo } = await import('../../../../src/common/config/info.js'))
})

test('isValid is correct', () => {
  expect(isValid({ errorBeacon: 'some value' })).toBeFalsy()
  expect(isValid({ errorBeacon: 'some value', licenseKey: 'cereal box' })).toBeFalsy()

  expect(isValid({ errorBeacon: 'some value', licenseKey: 'cereal box', applicationID: '25' })).toBeTruthy()
})

test('info jsAttributesBytes increments and decrements as expected', () => {
  const infoObj = mergeInfo({})
  expect(infoObj.jsAttributesBytes).toBe(0)
  infoObj.jsAttributes.foo = 'bar'
  expect(infoObj.jsAttributesBytes).toBe(8) // 'foo' + '"bar"'
  delete infoObj.jsAttributes.foo
  expect(infoObj.jsAttributesBytes).toBe(0)
})
