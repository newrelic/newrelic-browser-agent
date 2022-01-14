/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var through = require('through')
var fs = require('fs')
var path = require('path')

var version = 'DEVELOPMENT'
var subPath = ''
var buildNumberFile = path.resolve(__dirname, '../build/build_number')
var gitCommitFile = path.resolve(__dirname, '../build/git_commit')

var gitCommit, buildNumber
var gitCommitFromEnv = (process.env.ghprbActualCommit || process.env.GIT_COMMIT)

if (process.env.BUILD_NUMBER && gitCommitFromEnv) {
  buildNumber = process.env.BUILD_NUMBER
  gitCommit = gitCommitFromEnv
} else if (fs.existsSync(buildNumberFile) && fs.existsSync(gitCommitFile)) {
  buildNumber = fs.readFileSync(buildNumberFile, 'utf-8').trim()
  gitCommit = fs.readFileSync(gitCommitFile, 'utf-8').trim()
}

if (buildNumber) {
  version = buildNumber + '.' + gitCommit.slice(0, 7)
} else {
  version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf-8') + '.DEVELOPMENT'
}

if (process.env.SUBPATH) {
  if (process.env.SUBPATH.indexOf('/') >= 0) throw new Error('invalid character: /')
  subPath += process.env.SUBPATH + '/'
  version = String(Number(version.split('.')[0]) + Number(Boolean(process.env.PRE_RELEASE))) + '.' + process.env.SUBPATH.toUpperCase()
}

module.exports = versionify

function versionify (min, payloadVariant) {
  return function (file) {
    if (!(/harvest.js/.test(file) || /loader\/index.js/.test(file))) return through()
    var data = ''
    var stream = through(cat, end)

    function cat (part) {
      data += part
    }
    function end () {
      var payloadVariantPart = payloadVariant ? '-' + payloadVariant : '' // '' or '-<variant name>'
      var versionPart = process.env.SUBPATH ? '' : buildNumber ? '-' + buildNumber : '' // '' or '-<build number>'
      var minPart = min ? '.min' : ''

      // [-<variant name>][-<build number>][.min]
      var extension = payloadVariantPart + versionPart + minPart

      this.queue(
        data
          .toString()
          .replace(/<VERSION>/, version)
          .replace(/<EXTENSION>/, extension)
          .replace(/<PATH>/, subPath)
      )
      this.queue(null)
    }

    return stream
  }
}
