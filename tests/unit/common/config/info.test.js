let isValid, getInfo, setInfo
beforeEach(async () => {
  jest.resetModules()
  ;({ isValid, getInfo, setInfo } = await import('../../../../src/common/config/info.js'))
})

test('set/getInfo should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setInfo(undefined, {})).toThrow('require an agent id')
  expect(() => getInfo(undefined)).toThrow('require an agent id')
  expect(() => setInfo('', {})).toThrow('require an agent id')
  expect(() => getInfo('')).toThrow('require an agent id')
})

test('set/getInfo works correctly', () => {
  expect(() => setInfo(123, { beacon: 'im here' })).not.toThrow() // notice setInfo accepts numbers
  let cachedObj = getInfo('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.beacon).toEqual('im here')
  expect(cachedObj.licenseKey).toEqual(undefined) // this should mirror default in info.js
})

test('isValid is correct', () => {
  setInfo('ab', { errorBeacon: 'some value' })
  setInfo('cd', { errorBeacon: 'some value', licenseKey: 'cereal box' })
  expect(isValid('ab')).toBeFalsy()
  expect(isValid('cd')).toBeFalsy()

  setInfo('ef', { errorBeacon: 'some value', licenseKey: 'cereal box', applicationID: '25' })
  expect(isValid('ef')).toBeTruthy()
})
