import { getModeledObject } from '../../../../src/common/config/configurable'

jest.mock('../../../../src/common/util/console')

test('if either params are not objects, function fails', () => {
  let result = getModeledObject(123, {})
  expect(result).toEqual(undefined)

  result = getModeledObject({}, () => 'whatever')
  expect(result).toEqual(undefined)
})

test('models are not mutated by function', () => {
  const template = { dontchangethis: true }
  getModeledObject({ dontchangethis: false, addthis: true }, template)
  expect(template).toEqual({ dontchangethis: true })
})

const model = {
  eat: true,
  sleep: true,
  rave: true,
  repeat: {
    eat: true,
    sleep: true,
    rave: true,
    repeat: false
  }
}

test('empty object does not change model output', () => {
  expect(getModeledObject({}, model)).toEqual(model)
})

test('existing keys get their values changed', () => {
  let obj = {
    sleep: false,
    repeat: {
      eat: false
    }
  }
  expect(getModeledObject(obj, model)).toEqual({
    eat: true,
    sleep: false,
    rave: true,
    repeat: {
      eat: false, // should recurse
      sleep: true,
      rave: true,
      repeat: false
    }
  })
})

test('existing keys can change types too, to/from object', () => {
  // in other words, if replacement is not an object, it has no effect
  let obj = {
    rave: {},
    repeat: 'just a sad lonely string now'
  }
  expect(getModeledObject(obj, model)).toEqual({
    eat: true,
    sleep: true,
    rave: {},
    repeat: 'just a sad lonely string now'
  })
})

test('keys not in model are ignored', () => {
  expect(getModeledObject({ game: 'allnight' }, model)).toEqual(model)
})
test('but if model is empty, then keys are not ignored', () => {
  expect(getModeledObject({ game: 'allnight' }, {})).toEqual({ game: 'allnight' })
})

test('undefined and null keys in models passes through to output', () => {
  const template = { key1: 1, key2: undefined, key3: null }
  const output = getModeledObject({ key1: 'peepo' }, template)
  expect(output).toEqual({ key1: 'peepo', key2: undefined, key3: null })
})
test('undefined key in object does not overwrite model value', () => {
  const template = { key1: 1 }
  const output = getModeledObject({ key1: undefined }, template)
  expect(output).toEqual({ key1: 1 })
})
test('null key in object gets applied in output', () => {
  const template = { key1: 1 }
  const output = getModeledObject({ key1: null }, template)
  expect(output).toEqual({ key1: null })
})
