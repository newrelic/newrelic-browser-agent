var test = require('../../tools/jil/browser-test.js')
var config = require('../../loader/config')

test('getConfiguration', function (t) {
  t.test('returns value from NREUM.init using provided path', function(t) {
    NREUM.init = { a: 123 }
    t.equal(config.getConfiguration('a'), 123)

    NREUM.init = { a: { b: 123 } }
    t.equal(config.getConfiguration('a.b'), 123)

    NREUM.init = { a: { b: { c: 123 } } }
    t.equal(config.getConfiguration('a.b.c'), 123)

    t.end()
  })

  t.test('returns undefined when path does not match', function(t) {
    NREUM.init = { a: 123 }
    t.equal(config.getConfiguration('b', 456), undefined)

    NREUM.init = { a: { b: 123 } }
    t.equal(config.getConfiguration('a.c', 456), undefined)

    t.end()
  })

  t.test('returns undefined when configuration is missing', function(t) {
    delete NREUM.init
    t.equal(config.getConfiguration('a', 456), undefined)

    NREUM.init = {}
    t.equal(config.getConfiguration('a', 456), undefined)

    t.end()
  })
})
