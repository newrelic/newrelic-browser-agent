
const presets = [

]
const plugins = [
  ["transform-inline-environment-variables", {
    "include": [
      "MAJOR", "MINOR"
    ]
  }]
]


module.exports = { presets, plugins }