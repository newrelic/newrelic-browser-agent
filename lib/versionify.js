var through = require('through')
var fs = require('fs')
var path = require('path')

var version = 'DEVELOPMENT'
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
      var versionPart = buildNumber ? '-' + buildNumber : '' // '' or '-<build number>'
      var minPart = min ? '.min' : ''

      // [-<variant name>][-<build number>][.min]
      var extension = payloadVariantPart + versionPart + minPart

      this.queue(
        data
          .toString()
          .replace(/<VERSION>/, version)
          .replace(/<EXTENSION>/, extension)
      )
      this.queue(null)
    }

    return stream
  }
}
