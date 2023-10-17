import { isTrueObject } from './type-check'

test('isTrueObject', () => {
  expect(isTrueObject([])).toEqual(false)
  expect(isTrueObject(1)).toEqual(false)
  expect(isTrueObject('string')).toEqual(false)
  expect(isTrueObject(new Blob([]))).toEqual(false)

  expect(isTrueObject({ test: 1 })).toEqual(true)
  expect(isTrueObject({})).toEqual(true)
  expect(isTrueObject(new Object())).toEqual(true) // eslint-disable-line
  expect(isTrueObject(JSON.parse('{"test": 1}'))).toEqual(true)
})
