const pkg = require('../../package.json')
const fs = require('fs')
const path = require('path')

fetch('https://raw.githubusercontent.com/newrelic/newrelic-browser-agent/main/package.json').then(r => r.json()).then(({ version }) => {
  if (version === pkg.version) throw new Error("package.json version hasn't been updated.")
  fs.writeFileSync(path.join(__dirname, '../../', 'VERSION'), pkg.version)
})
