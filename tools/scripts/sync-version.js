const pkg = require('../../package.json')
const fs = require('fs')
const path = require('path')

fs.writeFileSync(path.join(__dirname, '../../', 'VERSION'), pkg.version)
