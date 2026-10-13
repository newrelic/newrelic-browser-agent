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

test('attribute bytes does not inflate when the same key is overwritten repeatedly', () => {
  const obj = { attributes: {} }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  for (let i = 0; i < 1000; i++) obj.attributes.foo = 'bar'
  expect(metadata.bytes).toBe(8) // 'foo' + '"bar"'
})

test('attribute bytes reflects the new value size when a key is overwritten with a different value', () => {
  const obj = { attributes: { foo: 'bar' } }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  obj.attributes.foo = 'longer value'
  expect(metadata.bytes).toBe(3 + 14) // 'foo' + '"longer value"'
  obj.attributes.foo = 'x'
  expect(metadata.bytes).toBe(3 + 3) // 'foo' + '"x"'
  delete obj.attributes.foo
  expect(metadata.bytes).toBe(0)
})

test('attribute bytes is unchanged when deleting a key that does not exist', () => {
  const obj = { attributes: { foo: 'bar' } }
  const metadata = trackObjectAttributeSize(obj, 'attributes')
  delete obj.attributes.missing
  expect(metadata.bytes).toBe(8)
})
