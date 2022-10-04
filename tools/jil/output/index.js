/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const tapParser = require('tap-parser')
const formatters = require('./formatters')
const {EventEmitter} = require('events')
const util = require('util')
const fs = require('fs')

let yamlChars = /\[|\?|\||:|-/

class Output {
  constructor (config) {
    this.formatter = new formatters[config.formatter](config)

    if (!config.quiet) {
      this.formatter.stream.pipe(process.stdout)
    }

    if (config.outputFile) {
      this.formatter.stream.pipe(fs.createWriteStream(config.outputFile))
    }

    this.formatter.start()
    this.children = []
    this.remaining = 0
  }

  log (...args) {
    this.formatter.log(...args)
  }

  addChild (name, stream) {
    let parser = new OutputParser(name, stream)

    this.children.push(parser)
    this.formatter.addOutputParser(parser)
    this.remaining += 1
    parser.on('exit', () => {
      if (--this.remaining > 0) return
    })

    return parser
  }

  finish() {
    this.formatter.finish(this.children.reduce((ok, next) => ok && next.ok || (next.results.pass === next.results.count), true))
  }
}

class OutputParser extends EventEmitter {
  constructor (name, stream) {
    super()

    this.tapParser = tapParser()
    this.name = name
    this.started = false
    this.done = false
    this.ok = true

    stream.pipe(this.tapParser)

    this.registerTapParser(this.tapParser)
    stream.on('data', (buf) => {
      this.started = true
      this.emit('out', buf.toString())
    })

    stream.on('end', () => {
      setTimeout(() => this.emit('exit'), 0)
    })
  }

  registerTapParser (parser, indent = '', parents = []) {
    let indentDepth = indent.length
    let lastComment = '<unknown>'

    parser.on('assert', (d) => {
      let data = util._extend({}, d)
      let tap = `${indent}${d.ok ? 'ok' : 'not ok'} ${this.name}: ${d.name}`

      if (d.diag) {
        data.formattedDiag = this.formatDiag(d.diag)
        tap += `\n${data.formattedDiag}`
      }

      this.emit('assert', data, indentDepth, [...parents, lastComment])
      this.emit('tap', tap)
      this.emit(d.ok ? 'pass' : 'fail', data, indentDepth, [...parents, lastComment])
      if (data.formattedDiag) {
        this.emit('diag', data.formattedDiag, indentDepth, [...parents, lastComment])
      }
    })

    parser.on('child', (child) => {
      this.registerTapParser(child, indent + '    ', [...parents, lastComment])
    })

    parser.on('comment', (d) => {
      let padding = getPadding(d)
      let comment = d.trim().slice(1).trim()

      lastComment = comment
      this.emit('comment', comment, padding.length, parents)

      if (comment.match(/Subtest:/)) {
        comment = comment.replace(/Subtest: /, `Subtest: ${this.name}: `)
        this.emit('tap', `${padding}# ${comment}`)
      } else {
        this.emit('tap', `${padding}# ${this.name}: ${comment}`)
      }
    })

    parser.on('extra', (d) => {
      let padding = getPadding(d)
      let extra = d.trim()
      this.emit('extra', extra, padding.length, [...parents, lastComment])
      this.emit('tap', `${padding}${this.name}: ${extra}`)
    })

    parser.on('plan', (plan) => {
      this.emit('plan', plan, indentDepth, [...parents, lastComment])
      // plans conflicts with merged tap output
      // this.emit('tap', `${indent}${plan.start}..${plan.end}`)
    })

    if (indent) return
    parser.on('complete', (results) => {
      this.done = true
      this.ok = this.ok && results.ok
      this.results = results
      this.emit('complete', results)
    })

    function getPadding (line) {
      return line.match(/\s*/)[0] + indent
    }
  }

  formatDiag (diag) {
    let msg = ['  ---']
    let keys = ['operator', 'expected', 'actual', 'at', 'stack'].filter((key) => key in diag)
    let longest = keys[0]

    for (let key of keys) {
      let indent = new Array(longest.length - key.length + 1).join(' ')
      msg.push(`    ${key}: ${indent}${formatVal(diag[key])}`)
    }

    return msg.join('\n') + '\n  ...'

    function formatVal (val) {
      let strVal = util.format(val)
      let lines = strVal.split('\n')
      if (lines.length === 1 && !yamlChars.test(strVal)) return strVal
      let indent = new Array(longest.length + 9).join(' ')
      return '-|\n' + lines.map((line) => `${indent}  ${line}`).join('\n')
    }
  }
}

module.exports = Output
module.exports.OutputParser = OutputParser
