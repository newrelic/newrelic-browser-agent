import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

// Apps whose framework dependency should always track the latest stable release before the
// framework informational test suite builds them. Only used by the dedicated framework-specs
// workflow - the regular `tools:test-builds` build leaves every app's pinned versions alone.
const APPS = [
  { app: 'vite-react-wrapper', packages: ['react', 'react-dom'] }
]

for (const { app, packages } of APPS) {
  const pkgPath = path.join(__dirname, app, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  for (const name of packages) {
    if (!pkg.dependencies || !(name in pkg.dependencies)) continue

    const previous = pkg.dependencies[name]
    const latest = execSync(`npm view ${name} version`, { encoding: 'utf-8' }).trim()
    pkg.dependencies[name] = latest

    console.log(`[bump-latest] ${app}: ${name} ${previous} -> ${latest}`)
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}
