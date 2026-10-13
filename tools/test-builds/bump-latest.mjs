import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const FRAMEWORKS_DIR = path.join(__dirname, 'frameworks')
const LOCAL_BROWSERS_DIR = path.join(__dirname, '../local-browsers')

// Every app under ./frameworks always tracks the latest stable release of its dependencies
// (everything except the agent itself) before the framework informational test suite builds
// them. The local browsers (../local-browsers, e.g. the packaged Electron the suite also runs the
// framework apps in) are bumped the same way so the report covers the latest of those too. Only
// used by the dedicated framework-specs workflow - the regular `tools:test-builds` build leaves
// every app's pinned versions alone.
const listDirs = (parent) => fs.existsSync(parent)
  ? fs.readdirSync(parent, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => path.join(parent, dir.name))
  : []
const apps = [...listDirs(FRAMEWORKS_DIR), ...listDirs(LOCAL_BROWSERS_DIR)]

for (const appDir of apps) {
  const app = path.relative(path.join(__dirname, '..'), appDir)
  const pkgPath = path.join(appDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  for (const name of Object.keys(pkg.dependencies || {})) {
    if (name === '@newrelic/browser-agent') continue

    const previous = pkg.dependencies[name]
    const latest = execSync(`npm view ${name} version`, { encoding: 'utf-8' }).trim()
    pkg.dependencies[name] = latest

    console.log(`[bump-latest] ${app}: ${name} ${previous} -> ${latest}`)
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}
