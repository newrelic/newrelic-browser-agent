const { UncaughtError } = require('../../../../../src/features/jserrors/shared/uncaught-error')

describe('UncaughtError', () => {
  test('handles string message', () => {
    expect(new UncaughtError('test').message).toEqual('test')
  })
  test('handles non-string message', () => {
    ;[1, true, false, ['test'], { test: 1 }].forEach(prop => {
      expect(new UncaughtError(prop).message).toEqual(JSON.stringify(prop))
    })
  })
})
