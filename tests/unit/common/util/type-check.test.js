import { isPureObject } from '../../../../src/common/util/type-check'

test('isPureObject', () => {
  expect(isPureObject([])).toEqual(false)
  expect(isPureObject(1)).toEqual(false)
  expect(isPureObject('string')).toEqual(false)
  expect(isPureObject(new Blob([]))).toEqual(false)
  expect(isPureObject(new Date())).toEqual(false)
  expect(isPureObject(null)).toEqual(false)
  expect(isPureObject(undefined)).toEqual(false)
  expect(isPureObject(function () {})).toEqual(false)
  expect(isPureObject(/./)).toEqual(false)
  expect(isPureObject(window.location)).toEqual(false)
  expect(isPureObject(Object.create(null))).toEqual(false)

  expect(isPureObject({ test: 1 })).toEqual(true)
  expect(isPureObject({})).toEqual(true)
  expect(isPureObject(new Object())).toEqual(true) // eslint-disable-line
  expect(isPureObject(JSON.parse('{"test": 1}'))).toEqual(true)
})
