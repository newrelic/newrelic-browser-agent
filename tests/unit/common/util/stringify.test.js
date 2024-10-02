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

test('should emit an "internal-error" event and still return a string if an error occurs during JSON.stringify', () => {
  jest.spyOn(eventEmitterModule.ee, 'emit')
  jest.spyOn(JSON, 'stringify').mockImplementation(() => {
    throw new Error('message')
  })

  const output = stringify('foo')

  expect(eventEmitterModule.ee.emit).toHaveBeenCalledWith('internal-error', expect.any(Array))
  expect(output).toEqual('')
})
