const process = require('process')
const path = require('path')
const fs = require('fs-extra')
const child_process = require('child_process')
const pkg = require('../../package.json')

const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
const tarball = path.resolve(__dirname, '../../temp', `${pkg.name.replace(/@/g, '').replace(/\//g, '-')}-${pkg.version}.tgz`)

function print (msg) {
  console.log(`\n================================\n${msg}\n================================\n`)
}

// Delete node_modules and package lock file
async function clean (folder) {
  print(`cleaning ./${path.relative(__dirname, folder)}`)

  await fs.remove(path.join(folder, 'node_modules'))
  await fs.remove(path.join(folder, 'package-lock.json'))
}

// Performs `npm install`
async function install (folder) {
  print(`installing ./${path.relative(__dirname, folder)}`)

  await new Promise((resolve, reject) => {
    const proc = child_process.spawn(npmCommand, ['install', tarball], { cwd: folder, env: process.env, stdio: 'inherit' })
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error('install failed'))
      } else {
        resolve()
      }
    })
  })
}

// Performs `npm build`
async function build (folder) {
  print(`Building ./${path.relative(__dirname, folder)}`)

  await new Promise((resolve, reject) => {
    const proc = child_process.spawn(npmCommand, ['run', 'build'], { cwd: folder, env: process.env, stdio: 'inherit' })
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error('install failed'))
      } else {
        resolve()
      }
    })
  })
}

print('Bundling "Test Builds"')
const packages = fs.readdirSync(__dirname, { withFileTypes: true })
  .filter(dir => dir.isDirectory())
  .filter(dir => {
    try {
      fs.accessSync(path.join(__dirname, dir.name, 'package.json'), fs.constants.R_OK | fs.constants.W_OK)
      return true
    } catch (err) {
      return false
    }
  })
  .map(dir => {
    const testPackagePath = path.join(__dirname, dir.name)
    return clean(testPackagePath)
      .then(() => install(testPackagePath))
      .then(() => build(testPackagePath))
  })

Promise.all(packages)
  .catch(err => {
    print('Build failed', err)
  })
