const pkg = require('../../package.json')
const fs = require('fs')
const path = require('path')

const cdn_version = fs.readFileSync(path.join(__dirname, '../../', 'VERSION'), 'utf-8')
const new_pkg_version = `0.${cdn_version.split('.').slice(0, 2).join('.')}`
pkg.version = new_pkg_version.replace(/^\s+|\s+$/g, '')
fs.writeFileSync(path.join(__dirname, '../../', 'package.json'), JSON.stringify(pkg, null, 2))
