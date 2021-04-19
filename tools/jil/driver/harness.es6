/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import through from 'through'
import inspect from 'object-inspect'
import defined from 'defined'
import has from 'has'
import bind from 'function-bind'
import {EventEmitter} from 'events'
import { Test } from 'tape'

var regexpTest = bind.call(Function.call, RegExp.prototype.test)
var yamlIndicators = /:|\-|\?/

export default class TestHarness extends EventEmitter {
  constructor (autoClose = true) {
    super()

    this.stream = through()
    this.count = 0
    this.pass = 0
    this.fail = 0
    this.tests = []
    this.running = false
    this.autoClose = autoClose
    this.closed = false
    this.started = false

    this.paused = false
    this.buffer = []
    this.bufferCounts = {
      count: 0,
      pass: 0,
      fail: 0
    }
  }

  addTest (name, opts, fn) {
    let test = new Test(name, opts, fn)
    this.tests.push(test)
    this._watch(test)

    if (this.started && !this.running && !this.autoClose) {
      this.run()
    }
  }

  pause () {
    this.paused = true
  }

  resume () {
    this.paused = false
    while (this.buffer.length) {
      var data = this.buffer.shift()
      this.stream.push(data)
    }

    this.count += this.bufferCounts.count
    this.pass += this.bufferCounts.pass
    this.fail += this.bufferCounts.fail

    this.bufferCounts = {
      count: 0,
      pass: 0,
      fail: 0
    }
  }

  clear () {
    this.buffer = []
    this.bufferCounts = {
      count: 0,
      pass: 0,
      fail: 0
    }
  }

  run () {
    if (this.closed) {
      throw new Error('TestHarness has already closed.')
    }

    let self = this
    let nextTick = process.nextTick
    this.running = true

    if (!this.started) {
      this.stream.push('TAP version 13\n')
      this.started = true
    }

    nextTick(next)

    function next () {
      var t = getNextTest()
      while (t) {
        t.run()
        if (!t.ended) {
          return t.once('end', function () { nextTick(next) })
        }
        t = getNextTest()
      }

      if (self.autoClose) {
        self._close()
      } else {
        self.running = false
      }
    }

    function getNextTest () {
      do {
        var t = self.tests.shift()
        if (!t) continue
        return t
      } while (self.tests.length !== 0)
    }
  }

  _watch (t) {
    var self = this
    let ended = false
    let plannedOk = true
    let handledPlannedAssertion = false

    t.once('prerun', function () {
      self._write('# ' + t.name + '\n')
    })

    t.on('result', function (res) {
      if (ended) {
        if (!plannedOk && !handledPlannedAssertion) {
          handledPlannedAssertion = true
          onResult(res)
        }
      } else {
        onResult(res)
      }
    })

    t.on('test', function (st) { self._watch(st) })

    t.once('end', function () {
      ended = true
      plannedOk = !t._plan || t._plan === t.assertCount
    })

    function onResult (res) {
      if (typeof res === 'string') {
        self._write('# ' + res + '\n')
        return
      }
      self._write(self._encodeResult(res, self.count + self.bufferCounts.count + 1))

      if (self.paused) {
        self.bufferCounts.count++
        self.bufferCounts.pass += res.ok ? 1 : 0
        self.bufferCounts.fail += res.ok ? 0 : 1
      } else {
        self.count++
        self.pass += res.ok ? 1 : 0
        self.fail += res.ok ? 0 : 1
      }

      if (!res.ok) {
        self.emit('fail')
      }
    }
  }

  close () {
    this._close()
  }

  _close () {
    var self = this
    if (self.closed) self.stream.emit('error', new Error('ALREADY CLOSED'))
    self.closed = true

    // Specifying the plan is optional, and it was here only because the `tape-parser`
    // module will flag the whole test as not ok. This is, however, not needed, and
    // including it makes testing more difficult (when retries output multiple plans)
    // self._write('\n1..' + self.count + '\n')
    self._write('# tests ' + self.count + '\n')
    self._write('# pass  ' + self.pass + '\n')
    if (self.fail) self._write('# fail  ' + self.fail + '\n')
    else self._write('\n# ok\n')

    self.stream.end()
    self.emit('done')
  }

  _write (data) {
    if (this.paused) {
      this.buffer.push(data)
    } else {
      this.stream.push(data)
    }
  }

  _encodeResult (res, count) {
    var output = ''
    output += (res.ok ? 'ok ' : 'not ok ') + count
    output += res.name ? ' ' + res.name.toString().replace(/\s+/g, ' ') : ''

    if (res.skip) output += ' # SKIP'
    else if (res.todo) output += ' # TODO'

    output += '\n'
    if (res.ok) return output

    var outer = '  '
    var inner = outer + '  '
    output += outer + '---\n'
    output += inner + 'operator: ' + res.operator + '\n'

    if (has(res, 'expected') || has(res, 'actual')) {
      var ex = inspect(res.expected, {depth: res.objectPrintDepth})
      var ac = inspect(res.actual, {depth: res.objectPrintDepth})

      if (Math.max(ex.length, ac.length) > 65 || invalidYaml(ex) || invalidYaml(ac)) {
        output += inner + 'expected: |-\n' + inner + '  ' + ex + '\n'
        output += inner + 'actual: |-\n' + inner + '  ' + ac + '\n'
      } else {
        output += inner + 'expected: ' + ex + '\n'
        output += inner + 'actual:   ' + ac + '\n'
      }
    }
    if (res.at) {
      output += inner + 'at: ' + res.at + '\n'
    }

    var actualStack = res.actual && (typeof res.actual === 'object' || typeof res.actual === 'function') ? res.actual.stack : undefined
    var errorStack = res.error && res.error.stack
    var stack = defined(actualStack, errorStack)
    if (stack) {
      var lines = String(stack).split('\n')
      output += inner + 'stack: |-\n'
      for (var i = 0; i < lines.length; i++) {
        output += inner + '  ' + lines[i] + '\n'
      }
    }

    output += outer + '...\n'
    return output
  }
}

function invalidYaml (str) {
  return regexpTest(yamlIndicators, str)
}
