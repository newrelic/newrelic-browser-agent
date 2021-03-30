var test = require('../../../tools/jil/browser-test')
var computeStackTrace = require('../../../feature/err/aggregate/compute-stack-trace')
var stringify = require('../../../agent/stringify')
var testcases = require('./stack-parse-testcases')

test('computeStackTrace', function (t) {
  for (var i = 0; i < testcases.length; i++) {
    var testcase = testcases[i]
    t.equal(stringify(computeStackTrace(testcase.stack)), stringify(testcase.info), testcase.message)
  }
  t.end()
})
