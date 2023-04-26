import { LocalStorage } from './local-storage'

test('Local-memory', () => {
  const LS = new LocalStorage()

  LS.set('test', 1)
  expect(LS.get('test')).toEqual('1')

  LS.set('test')
  expect(LS.get('test')).toEqual(undefined)

  LS.set('test', 2)
  expect(LS.get('test')).toEqual('2')

  LS.remove('test')
  expect(LS.get('test')).toEqual(undefined)
})
