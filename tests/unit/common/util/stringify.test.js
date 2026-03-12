import { stringify } from '../../../../src/common/util/stringify'
import * as eventEmitterModule from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/common/util/stringify')

test('should utilize JSON.stringify to serialize input data', () => {
  jest.spyOn(JSON, 'stringify')

  const input = { a: 1, b: { nested: true } }
  const expected = '{"a":1,"b":{"nested":true}}'

  const result = stringify(input)

  expect(JSON.stringify).toHaveBeenCalledWith(input, expect.any(Function))
  expect(result).toEqual(expected)
})

test.each([
  ['array', [0, 1, 'asdf', undefined, null, 'weee'], '[0,1,"asdf",null,null,"weee"]'],
  ['object', { a: 123, c: 'b', f: 'asdf', u: undefined, n: null }, '{"a":123,"c":"b","f":"asdf","n":null}'],
  ['undefined', undefined, ''],
  ['null', null, 'null'],
  ['number', 123, '123'],
  ['string', '0', '"0"'],
  ['symbol', Symbol('foo'), ''],
  ['function', function F () {}, ''],
  ['toJSON valid', { toJSON: () => ({ foo: 'bar' }) }, '{"foo":"bar"}'],
  ['toJSON undefined', { toJSON: () => undefined }, ''],
  ['toJSON error', { toJSON: () => { throw new Error('toJSON') } }, ''],
  ['object w/ prototype', (() => { function F () {}; F.prototype = { a: 123 }; const obj = new F(); obj.other = 222; return obj })(), '{"other":222}'],
  ['nested json', { stringified: stringify({ a: 123, c: 'b', f: 'asdf', u: undefined, n: null }) }, '{"stringified":"{\\"a\\":123,\\"c\\":\\"b\\",\\"f\\":\\"asdf\\",\\"n\\":null}"}']
])('should serialize input %s properly', (_, input, expected) => {
  expect(stringify(input)).toEqual(expected)
})

test('should support serializing circular references by omitting the circular reference', () => {
  const input = { a: 1 }
  input.circular = input
  input.arr = ['foo', input]

  expect(stringify(input)).toEqual('{"a":1,"arr":["foo",null]}')
})

test('should allow the same object to appear multiple times (duplicate references) without treating it as circular', () => {
  // Simulates the scenario where the same "params" object is shared across multiple error events
  const sharedParams = {
    stackHash: -10208229,
    exceptionClass: 'Error',
    message: 'test error'
  }

  const input = {
    err: [
      {
        params: sharedParams,
        custom: { 'source.id': 'first' },
        metrics: { count: 1 }
      },
      {
        params: sharedParams, // Same object reference, but not circular
        custom: { 'entity.guid': 'second' },
        metrics: { count: 1 }
      }
    ]
  }

  const result = stringify(input)
  const parsed = JSON.parse(result)

  // Both err objects should have their params preserved
  expect(parsed.err[0].params).toEqual(sharedParams)
  expect(parsed.err[1].params).toEqual(sharedParams)
})

test('should emit an "internal-error" event and still return a string if an error occurs during JSON.stringify', () => {
  jest.spyOn(eventEmitterModule.ee, 'emit')
  jest.spyOn(JSON, 'stringify').mockImplementation(() => {
    throw new Error('message')
  })

  const output = stringify('foo')

  expect(eventEmitterModule.ee.emit).toHaveBeenCalledWith('internal-error', expect.any(Array))
  expect(output).toEqual('')
})
