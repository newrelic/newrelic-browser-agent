const path = require('path')
const fs = require('fs')
const child_process = require('child_process')
const pkg = require('../../package.json')

const tarball = path.resolve(__dirname, '../../temp', `${pkg.name.replace(/@/g, '').replace(/\//g, '-')}-${pkg.version}.tgz`)

const root = process.cwd()

// Since this script is intended to be run as a "postinstall" command,
// it will do `npm install` automatically inside the root folder before any of the subfolders.
print('Bundling "Test Builds"')

recurse(root)

function print (msg) {
  console.log(`\n================================\n${msg}\n================================\n`)
}

// Recurses into a folder
function recurse (folder) {
  const has_package_json = fs.existsSync(path.join(folder, 'package.json'))
  // If there is `package.json` in this folder then perform `npm install`.
  if (has_package_json && folder !== root) {
    install(folder)
    build(folder)
  } else {
    // Recurse into subfolders
    for (let subfolder of subfolders(folder)) {
      recurse(subfolder)
    }
  }
}

// Performs `npm install`
function install (folder) {
  const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
  print(`installing ./${path.relative(root, folder)}`)
  // Clear the cached version of the npm package
  child_process.execSync('rm -rf node_modules', { cwd: folder, env: process.env, stdio: 'inherit' })
  child_process.execSync('rm -rf package-lock.json', { cwd: folder, env: process.env, stdio: 'inherit' })
  // Re-install node modules
  child_process.execSync('npm install', { cwd: folder, env: process.env, stdio: 'inherit' })
}

// Performs `npm build`
function build (folder) {
  const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
  print(`Building ./${path.relative(root, folder)}`)

  child_process.execSync('npm run build', { cwd: folder, env: process.env, stdio: 'inherit' })
}

// Lists subfolders in a folder
function subfolders (folder) {
  return fs.readdirSync(folder)
    .filter(subfolder => fs.statSync(path.join(folder, subfolder)).isDirectory())
    .filter(subfolder => subfolder !== 'node_modules' && subfolder[0] !== '.')
    .map(subfolder => path.join(folder, subfolder))
}
