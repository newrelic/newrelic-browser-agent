var test = require('../../tools/jil/browser-test.js')
var protocolAllowed = require('../../loader/protocol-allowed')

test('returns false when protocol is file', function(t) {
  t.equals(protocolAllowed({ protocol: 'file:' }), false)
  t.end()
})

test('when location is not defined, returns false', function(t) {
  t.equals(protocolAllowed(), false)
  t.end()
})

test('when location protocol is not defined, returns false', function(t) {
  t.equals(protocolAllowed({}), false)
  t.end()
})

test('when location protocol is http, returns true', function(t) {
  t.equals(protocolAllowed({ protocol: 'http:' }), true)
  t.end()
})

test('when location protocol is https, returns true', function(t) {
  t.equals(protocolAllowed({ protocol: 'https:' }), true)
  t.end()
})
