let isValid
beforeEach(async () => {
  jest.resetModules()
  ;({ isValid } = await import('../../../../src/common/config/info.js'))
})

test('isValid is correct', () => {
  expect(isValid({ errorBeacon: 'some value' })).toBeFalsy()
  expect(isValid({ errorBeacon: 'some value', licenseKey: 'cereal box' })).toBeFalsy()

  expect(isValid({ errorBeacon: 'some value', licenseKey: 'cereal box', applicationID: '25' })).toBeTruthy()
})
