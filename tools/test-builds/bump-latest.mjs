import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const FRAMEWORKS_DIR = path.join(__dirname, 'frameworks')
const LOCAL_BROWSERS_DIR = path.join(__dirname, '../local-browsers')

// Every app under ./frameworks always tracks the latest stable release of its dependencies + devDependencies
// (everything except the agent itself) before the framework informational test suite builds
// them. The local browsers (../local-browsers, e.g. the packaged Electron the suite also runs the
// framework apps in) are bumped the same way so the report covers the latest of those too. Only
// used by the dedicated framework-specs workflow - the regular `tools:test-builds` build leaves
// every app's pinned versions alone.
const listDirs = (parent) => fs.existsSync(parent)
  ? fs.readdirSync(parent, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => path.join(parent, dir.name))
  : []
const apps = [...listDirs(FRAMEWORKS_DIR), ...listDirs(LOCAL_BROWSERS_DIR)]

/*
 * Packages that must not jump to their absolute latest because the app's other tooling has not
 * caught up yet (an unresolvable peer range fails `npm install` and takes down the whole build).
 * They still bump to the newest release inside the given range. Keyed by app folder (relative to
 * tools/, matching the `app` label logged below) then package name. Remove an entry once its
 * tooling supports the newer release.
 */
const VERSION_CAPS = {
  // @angular-devkit/build-angular peers on typescript ">=6.0 <6.1", and the Angular compiler needs the
  // TypeScript JS API that typescript@7 no longer ships
  'test-builds/frameworks/angular': { typescript: '~6.0' },
  // svelte-check peers on typescript "^5.0.0 || ^6.0.0" (TS 7 needs a dual typescript@6 + @typescript/native install)
  'test-builds/frameworks/svelte': { typescript: '^6' },
  // vue-tsc requires typescript/lib/tsc, which typescript@7 does not export
  'test-builds/frameworks/vue': { typescript: '^6' }
}

/**
 * Resolves the version a dependency should be bumped to.
 * @param {string} name The package name.
 * @param {string} [range] Optional semver range to stay within; defaults to the latest release.
 * @returns {string} The newest published version, within `range` when one is given.
 */
const resolveVersion = (name, range) => {
  if (!range) return execSync(`npm view ${name} version`, { encoding: 'utf-8' }).trim()
  // with a range, npm returns an array of every match, or a bare string when only one matches
  const matches = JSON.parse(execSync(`npm view ${name}@"${range}" version --json`, { encoding: 'utf-8' }))
  return [matches].flat().at(-1)
}

for (const appDir of apps) {
  const app = path.relative(path.join(__dirname, '..'), appDir)
  const pkgPath = path.join(appDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  for (const depField of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(pkg[depField] || {})) {
      if (name === '@newrelic/browser-agent') continue

      const previous = pkg[depField][name]
      const cap = VERSION_CAPS[app]?.[name]
      const latest = resolveVersion(name, cap)
      pkg[depField][name] = latest

      const capNote = cap ? ` (capped to ${cap})` : ''

      console.log(`[bump-latest] ${app}: ${name} ${previous} -> ${latest}${capNote}`)
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}
