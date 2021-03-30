import jil from 'jil'

jil.browserTest('parameters not modified', function (t) {
  var ee = require('ee').get('handle')
  var drain = require('../../../agent/drain')
  let loader = require('loader')
  loader.info = {}
  require('../../../feature/ins/aggregate/index.js')

  let name = 'MyEvent'
  let args = {
    foo: 'bar',
    hello: {world: 'again'}
  }

  ee.emit('feat-ins', [])
  drain('feature')
  ee.emit('api-addPageAction', [t, name, args])

  t.deepEqual(args, {
    foo: 'bar',
    hello: {world: 'again'}
  })

  t.end()
})
