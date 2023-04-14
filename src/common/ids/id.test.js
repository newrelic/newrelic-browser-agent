let idFn

beforeEach(async () => {
  idFn = (await import('./id')).id
})

afterEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

test.each([
  { input: undefined, expected: -1, title: 'id of undefined is -1' },
  { input: null, expected: -1, title: 'id of null is -1' },
  { input: 2, expected: -1, title: 'id of number is -1' },
  { input: 'foo', expected: -1, title: 'id of string is -1' }
])('$title', ({ input, expected }) => {
  const result = idFn(input)

  expect(typeof result).toEqual('number')
  expect(result).toEqual(expected)
})

test('id is correctly assigned to function type', () => {
  const input = jest.fn()

  const result = idFn(input)

  expect(result).toEqual(1)
  expect(input['nr@id']).toEqual(1)
})

test('id is correctly assigned to object type', () => {
  const input = {}

  const result = idFn(input)

  expect(result).toEqual(1)
  expect(input['nr@id']).toEqual(1)
})

test('id is the same when called twice on the same input', () => {
  const input = {}

  const result1 = idFn(input)
  const result2 = idFn(input)

  expect(result1).toEqual(1)
  expect(result2).toEqual(1)
  expect(input['nr@id']).toEqual(1)
})

test('id is zero on global scope', async () => {
  const result = idFn(global)

  expect(result).toEqual(0)
})

test('id on prototype is correctly inherited', () => {
  const fn = jest.fn()
  const a = {}

  idFn(a)
  fn.prototype = a

  const b = new fn()

  expect(b['nr@id']).toEqual(a['nr@id'])
})

test('id on prototype is different from instance', () => {
  const fn = jest.fn()
  const a = {}

  idFn(a)
  fn.prototype = a

  const b = new fn()
  const result = idFn(b)

  expect(b['nr@id']).toEqual(result)
})
