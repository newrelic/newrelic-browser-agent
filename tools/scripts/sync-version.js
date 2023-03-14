const pkg = require('../../package.json')
const fs = require('fs')
const path = require('path')

const cdn_version = fs.readFileSync(path.join(__dirname, '../../', 'VERSION'), 'utf-8')
const [major, minor, patch] = cdn_version.split('.')
const new_pkg_version = `0.${major}.${minor}${patch && patch > 0 ? `-rc.${patch}` : ''}`
pkg.version = new_pkg_version.replace(/^\s+|\s+$/g, '')
fs.writeFileSync(path.join(__dirname, '../../', 'package.json'), JSON.stringify(pkg, null, 2))
