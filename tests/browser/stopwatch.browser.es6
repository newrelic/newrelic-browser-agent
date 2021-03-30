var test = require('../../tools/jil/browser-test.js')
var agg = require('../../agent/aggregator')
var stopwatch = require('../../agent/stopwatch')

test('stopwatch', function (t) {
  stopwatch.mark('a', 0)
  stopwatch.mark('b', 100)

  stopwatch.measure('first', 'a', 'b')
  stopwatch.measure('second', 'a', 'd')
  stopwatch.measure('third', 'c', 'b')

  t.equal(agg.get('measures', 'first').params.value, 100, 'Able to measure marks')
  t.equal(agg.get('measures', 'second'), undefined, 'Missing second mark turns into undefined measure')
  t.equal(agg.get('measures', 'third'), undefined, 'Missing first mark turns into undefined measure')

  t.end()
})
