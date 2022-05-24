const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const root = process.cwd()

// Since this script is intended to be run as a "postinstall" command,
// it will do `npm install` automatically inside the root folder before any of the subfolders.
print('Installed Root Package')

npm_install_recursive(root)

function print(msg) {
  console.log(`\n================================\n${msg}\n================================\n`)
}

// Recurses into a folder
function npm_install_recursive(folder) {
  if (folder.endsWith('newrelic-browser-agent/packages')) return
  const has_package_json = fs.existsSync(path.join(folder, 'package.json'))
  // If there is `package.json` in this folder then perform `npm install`.
  if (has_package_json && folder !== root) {
    npm_install(folder)
  }
  // Recurse into subfolders
  for (let subfolder of subfolders(folder)) {
    npm_install_recursive(subfolder)
  }
}

// Performs `npm install`
function npm_install(folder) {
  const cmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
  print(`Installing ./${path.relative(root, folder)}`)

  try {
    child_process.execSync(`${cmd} ci`, { cwd: folder, env: process.env, stdio: 'inherit' })
  } catch (err) {
    child_process.execSync(`${cmd} i`, { cwd: folder, env: process.env, stdio: 'inherit' })
  }
}

// Lists subfolders in a folder
function subfolders(folder) {
  return fs.readdirSync(folder)
    .filter(subfolder => fs.statSync(path.join(folder, subfolder)).isDirectory())
    .filter(subfolder => subfolder !== 'node_modules' && subfolder[0] !== '.')
    .map(subfolder => path.join(folder, subfolder))
}