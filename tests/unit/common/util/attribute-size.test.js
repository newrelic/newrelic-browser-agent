import { trackObjectAttributeSize } from '../../../../src/common/util/attribute-size'

test('attribute bytes increments and decrements as expected', () => {
  const obj = { attributes: {} }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  expect(metadata.bytes).toBe(0)
  obj.attributes.foo = 'bar'
  expect(metadata.bytes).toBe(8) // 'foo' + '"bar"'
  delete obj.attributes.foo
  expect(metadata.bytes).toBe(0)
})

test('attribute bytes is correct when pre-populated', () => {
  const obj = { attributes: { foo: 'bar' } }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  expect(metadata.bytes).toBe(8) // 'foo' + '"bar"'
  delete obj.attributes.foo
  expect(metadata.bytes).toBe(0)
})

test('attribute bytes is correct when attribute doesnt exist yet', () => {
  const obj = { }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  expect(metadata.bytes).toBe(0)
  obj.attributes.foo = 'bar'
  expect(metadata.bytes).toBe(8) // 'foo' + '"bar"'
  delete obj.attributes.foo
  expect(metadata.bytes).toBe(0)
})
