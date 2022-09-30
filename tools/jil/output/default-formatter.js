/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const charm = require('charm')
const encode = require('charm/lib/encode')
const BaseFormatter = require('./base-formatter')
const debounce = require('just-debounce')
const {format} = require('util')

let colorCodes = {
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  reset: 0
}

let colorNames = Object.keys(colorCodes)

class DefaultFormatter extends BaseFormatter {
  constructor (config) {
    super(config)

    this.charm = charm()
    this.charm.pipe(this.stream)
    this.pending = []
    this.rows = []
    this.longest = 0
    this.lines = 0

    this.draw = debounce(() => {
      this.redraw()
    }, 16)
  }

  finish (ok) {
    this.redraw()
    super.finish(ok)
  }

  addOutputParser (parser) {
    let name = parser.name
    let row = {
      parser: parser,
      data: []
    }

    this.rows.push(row)
    this.longest = Math.max(this.longest, parser.name.length)

    parser.on('assert', (d, indent, testNames) => {
      row.data.push(d.ok)
      this.draw()

      // print the test name for failed assertions, but only if we're not in
      // verbose mode, since in that case it will have been printed already
      // via the 'comment' event.
      if (!d.ok && !this.config.verbose) {
        let testName = testNames.join(' -> ')
        this.writeLine(name, `# ${testName}`, indent)
      }

      let status = d.ok ? 'ok' : 'not ok'
      if (!d.ok || this.config.verbose) {
        this.writeLine(name, `${status} ${d.name}`, indent)
      }

      if (d.formattedDiag) this.writeLine(name, d.formattedDiag, indent)
    })

    this.draw()

    parser.on('extra', (d, indent) => {
      if (this.config.verbose || d.match(/DEBUG:/)) {
        this.writeLine(name, d, indent + 4)
      }
    })

    if (!this.config.verbose) return
    parser.on('comment', (d, indent) => this.writeLine(name, `# ${d}`, indent))
    parser.on('plan', (d, indent) => this.writeLine(name, `${d.start}..${d.end}`, indent))
  }

  log (...args) {
    var data = format(...args)
    this.writeLine('log', data, 0)
  }

  writeLine (...args) {
    this.pending.push(args)
    this.draw()
  }

  indentString (n) {
    return new Array(n + 1).join(' ')
  }

  computeBlankLine () {
    return encode('[K') + '\n'
  }

  computeLine (name, data, additionalIndent = 0) {
    const color = this.getColor(name)
    const [first, ...rest] = data.split('\n')
    const indent = Math.max(this.longest - name.length + additionalIndent, 0)

    // clear to end of line
    let line = encode('[K')

    if (name) {
      line += this.color(color)
      line += `${name}: `
      line += this.resetColor()
    } else {
      line += '  '
    }

    if (indent) line += this.indentString(indent)
    line += `${first}\n`
    for (let dataLine of rest) {
      line += this.indentString(this.longest + 2 + additionalIndent)
      line += `${dataLine}\n`
    }

    return line
  }

  withColor (color, string) {
    return this.color(color) + string + this.resetColor()
  }

  renderRowStatus (parser) {
    if (!parser.done && parser.started) return `${this.withColor('yellow', 'Running...')} - [${this.withColor('green', 'Passed')}, ${this.withColor('red', 'Failed')}]`
    else if (!parser.done) return `${this.withColor('yellow', 'Pending...')}`
    else return `${this.withColor('yellow', 'Done')} - [${this.withColor('green', 'Passed')}, ${this.withColor('red', 'Failed')}]`
  }

  renderCounts (asserts, countWidth) {
    let numPassed = asserts.filter(Boolean).length
    let failures = asserts.length - numPassed

    let result = '[ '
    let numPassedJust = rjust(asserts.length.toString(), countWidth)
    result += this.withColor('green', numPassedJust)
    result += ' / '

    if (failures > 0) {
      result += this.withColor('red', failures)
    } else {
      result += failures
    }
    result += ' ]'
    return result

    function rjust (string, width) {
      var result = ''
      if (string.length < width) {
        for (var i = 0; i < width - string.length; i++) result += ' '
      }
      result += string
      return result
    }
  }

  redraw () {
    // clear test status
    let output = this.lines ? encode('[' + this.lines + 'A') : ''
    this.lines = 0

    // add new output
    for (let args of this.pending) {
      output += this.computeLine(...args)
    }

    this.pending = []

    output += this.computeBlankLine()
    this.lines += 1

    let maxAssertions = Math.max(...this.rows.map((row) => row.data.length))
    let assertionCountWidth = maxAssertions.toString().length

    // write test status
    for (let {parser, data} of this.rows) {
      this.lines += 1
      let line = this.renderRowStatus(parser) + ' ' + this.renderCounts(data, assertionCountWidth)
      output += this.computeLine(parser.name, line)
    }

    this.charm.write(output)
  }

  getColor (name) {
    let id = name.split('').reduce((n, c) => n + c.charCodeAt(0), 0)
    return colorNames[id % colorNames.length]
  }

  color (color) {
    if (typeof color === 'number') return encode('[38;5;' + color + 'm')
    var code = colorCodes[color]

    return encode('[' + code + 'm')
  }

  resetColor (charm) {
    return encode('[0m')
  }
}

module.exports = DefaultFormatter
