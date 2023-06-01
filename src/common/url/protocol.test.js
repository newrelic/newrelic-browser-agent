import { isFileProtocol } from './protocol'

test('should return true when location url contains file protocol', () => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({
    protocol: 'file:'
  })

  expect(isFileProtocol()).toEqual(true)
})

test('should return false when location url does not contains file protocol', () => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({
    protocol: 'http:'
  })

  expect(isFileProtocol()).toEqual(false)
})
