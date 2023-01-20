
const presets = [

]
const plugins = [
  ["transform-inline-environment-variables", {
    "include": [
      "BUILD_VERSION"
    ]
  }]
]


module.exports = { presets, plugins }