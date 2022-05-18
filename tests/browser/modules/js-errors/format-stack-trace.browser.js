/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import test from '../../../../tools/jil/browser-test'
import { formatStackTrace, truncateSize } from '../../../../packages/browser-agent-core/features/js-errors/aggregate/format-stack-trace'

test('formatStackTrace', function (t) {
  var lines = []
  for (var i = 0; i < 200; i++) {
    lines.push('line ' + i)
  }

  var expectedLongStackString = ''
  for (i = 0; i < 50; i++) {
    if (expectedLongStackString) expectedLongStackString += '\n'
    expectedLongStackString += 'line ' + i
  }
  expectedLongStackString += '\n< ...truncated 100 lines... >'
  for (i = 150; i < 200; i++) {
    expectedLongStackString += '\n'
    expectedLongStackString += 'line ' + i
  }

  var testCases = [
    [lines, expectedLongStackString],
    [lines.slice(0, 5), 'line 0\nline 1\nline 2\nline 3\nline 4'],
    [['', 'line 1', 'line 2'], 'line 1\nline 2'],
    [['line 1', 'line 2', ''], 'line 1\nline 2']
  ]

  for (i = 0; i < testCases.length; i++) {
    t.equal(formatStackTrace(testCases[i][0]), testCases[i][1])
  }
  t.end()
})

test('truncateSize', function(t) {
  var maxSize = 65530

  var longStackString = generateStackTrace(1000, 65)
  t.ok(longStackString.length > maxSize, 'stack trace is longer than max allowed')
  t.ok(truncateSize(longStackString).length === maxSize, 'truncated size is the maximum allowed')

  var smallStack = generateStackTrace(1000, 64)
  t.ok(smallStack.length < maxSize, 'stack trace is shorter than max allowed')
  t.equal(smallStack, truncateSize(smallStack), 'small stack is not modified')
  t.equal(smallStack.length, truncateSize(smallStack).length, 'small stack is not truncated')

  t.end()
})

function generateStackTrace(lines, lineLength) {
  var stackString = ''
  for (var i = 0; i < lines; i++) {
    if (stackString) stackString += '\n'
    var line = 'line ' + i + ' '
    while (line.length < lineLength) {
      line += 'x'
    }
    stackString += line
  }
  return stackString
}
