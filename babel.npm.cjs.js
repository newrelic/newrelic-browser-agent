console.log(process.env.MAJOR)

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
      "MAJOR", "MINOR"
    ]
  }]
]


module.exports = { presets, plugins }