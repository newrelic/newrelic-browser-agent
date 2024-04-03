import { cleanURL } from '../../../../src/common/url/clean-url'

test.each([
  ['http://domain.com/path?query=5', 'http://domain.com/path'],
  ['http://domain.com/path#fragment', 'http://domain.com/path'],
  ['http://domain.com/path?query=5#fragment', 'http://domain.com/path'],
  ['http://domain.com/path?query=5?dumb#fragment', 'http://domain.com/path'],
  ['http://domain.com/path?query=5#fragment#dumb', 'http://domain.com/path'],
  ['http://domain.com/path?query=5#fragment#dumb?additional_query', 'http://domain.com/path'],
  ['http://domain.com/path?query=5#fragment/silly/dumber#dumbest?additional_query=silly#what_is_this_even', 'http://domain.com/path']
])('cleanURL should remove hash', (input, expected) => {
  expect(cleanURL(input)).toEqual(expected)
})

test.each([
  ['http://domain.com/path?query=5', 'http://domain.com/path'],
  ['http://domain.com/path#fragment', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5#fragment', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5?dumb#fragment', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5#fragment#dumb', 'http://domain.com/path#fragment#dumb'],
  ['http://domain.com/path?query=5#fragment#dumb?additional_query', 'http://domain.com/path#fragment#dumb'],
  ['http://domain.com/path?query=5#fragment/silly/dumber#dumbest?additional_query=silly#what_is_this_even', 'http://domain.com/path#fragment/silly/dumber#dumbest']
])('cleanURL should retain hash if second argument is true', (input, expected) => {
  expect(cleanURL(input, true)).toEqual(expected)
})
