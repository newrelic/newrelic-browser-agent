var fs = require('fs')
var yargs = require('yargs')
var pkg = require('../../package.json')
var { execSync } = require('child_process')
const path = require('path')

const root = process.cwd()
var topLevelVersion = pkg.version
var argv = yargs
    .string('path')
    .describe('path', 'path to package')

    .boolean('beta')
    .describe('beta', 'if true, will set beta tag to version')
    .default(false)
    .argv

function print(msg) {
    console.log(`\n================================\n${msg}\n================================\n`)
}

function run() {
    var packagePath = argv['path']
    if (!packagePath) {
        print('path must be specified')
        return process.exit(1)
    }
    const has_package_json = fs.existsSync(path.join(root, packagePath, 'package.json'))
    if (!has_package_json) {
        print(`${packagePath} does not have package.json`)
        return process.exit(1)
    }

    const directory = path.join(root, packagePath)
    update(directory)
    version(directory)
    // publish(directory)
}

function version(directory) {
    try {
        print(`setting package at ${directory} version to ${topLevelVersion}`)
        const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
        execSync(`${cmd} version ${topLevelVersion} --allow-same-version -m "bump version to %s"`, { cwd: directory, env: process.env, stdio: 'inherit' })
    } catch (err) {
        print(err)
        return process.exit(1)
    }
}

function update(directory) {
    try {
        print(`updating dependencies for package at ${directory}`)
        const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
        execSync(`${cmd} update`, { cwd: directory, env: process.env, stdio: 'inherit' })
    } catch (err) {
        print(err)
        return process.exit(1)
    }
}

function publish(directory) {
    try {
        print(`publishing package at ${directory} to NPM registry`)
        const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
        execSync(`${cmd} publish`, { cwd: directory, env: process.env, stdio: 'inherit' })
    } catch (err) {
        print(err)
        return process.exit(1)
    }
}

run()



