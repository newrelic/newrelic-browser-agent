
const pkg = require('./package.json')

process.env['BUILD_VERSION'] = pkg.version

console.log(process.env.BUILD_VERSION)

const presets = [
  [
    "@babel/preset-env",
    {
      "targets": {
        "node": true
      }
    }
  ]
]
const plugins = [
  ["transform-inline-environment-variables", {
    "include": [
      "BUILD_VERSION"
    ]
  }]
]


module.exports = { presets, plugins }