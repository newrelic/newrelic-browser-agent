import { faker } from '@faker-js/faker'
import { getLocation } from './location'

test('should always return a string', () => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({})

  expect(typeof getLocation()).toEqual('string')
})

test('should return window location', () => {
  const expected = faker.internet.url()
  jest.spyOn(window, 'location', 'get').mockReturnValue(expected)

  expect(getLocation()).toEqual(expected)
})
