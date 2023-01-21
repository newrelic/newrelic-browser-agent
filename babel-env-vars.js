
const pkg = require('./package.json')
const fs = require('fs')

const VERSION = fs.readFileSync('./VERSION', 'utf-8')

module.exports = (source, subversion) => {
    if (!process.env['BUILD_VERSION']) {
        if (source === 'VERSION') process.env['BUILD_VERSION'] = `${VERSION}.${subversion || 'LOCAL'}`
        else if (source && source !== 'PACKAGE') process.env['BUILD_VERSION'] = `${source}.${subversion || 'LOCAL'}`
        else process.env['BUILD_VERSION'] = pkg.version
    }
    return ["transform-inline-environment-variables", {
        "include": [
            "BUILD_VERSION"
        ]
    }]
}