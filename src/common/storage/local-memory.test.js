import { LocalMemory } from './local-memory'

test('Local-memory', () => {
  const LM = new LocalMemory({ test: 1 })
  expect(LM.state).toEqual({ test: 1 })
  expect(LM.get('test')).toEqual(1)

  LM.set('test', 2)
  expect(LM.get('test')).toEqual(2)

  LM.set('test')
  expect(LM.get('test')).toEqual(undefined)

  LM.set('test', 2)
  expect(LM.get('test')).toEqual(2)

  LM.remove('test')
  expect(LM.get('test')).toEqual(undefined)
})
