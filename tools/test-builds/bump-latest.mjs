import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const FRAMEWORKS_DIR = path.join(__dirname, 'frameworks')

// Every app under ./frameworks always tracks the latest stable release of its dependencies
// (everything except the agent itself) before the framework informational test suite builds
// them. Only used by the dedicated framework-specs workflow - the regular `tools:test-builds`
// build leaves every app's pinned versions alone.
const apps = fs.existsSync(FRAMEWORKS_DIR)
  ? fs.readdirSync(FRAMEWORKS_DIR, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
  : []

for (const app of apps) {
  const pkgPath = path.join(FRAMEWORKS_DIR, app, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  for (const name of Object.keys(pkg.dependencies || {})) {
    if (name === '@newrelic/browser-agent') continue

    const previous = pkg.dependencies[name]
    const latest = execSync(`npm view ${name} version`, { encoding: 'utf-8' }).trim()
    pkg.dependencies[name] = latest

    console.log(`[bump-latest] frameworks/${app}: ${name} ${previous} -> ${latest}`)
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}
