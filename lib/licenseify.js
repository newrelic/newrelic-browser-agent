/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var fs = require('fs')
var through = require('through')
var license = '// ' + fs.readFileSync('LICENSE').toString().replace(/\n/g, '\n// ') + '\n\n'

module.exports = licenseify

function licenseify (file) {
  if (!/aggregator/.test(file)) return through()
  var data = ''
  var stream = through(cat, end)

  function cat (part) {
    data += part
  }
  function end () {
    this.queue(license + data)
    this.queue(null)
  }

  return stream
}
