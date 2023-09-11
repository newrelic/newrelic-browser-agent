import process from 'process'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const REPO_ROOT_PATH = path.resolve(__dirname, '../../../')
export const DEFAULT_SPAWN_OPTIONS = {
  cwd: REPO_ROOT_PATH,
  stdio: 'inherit',
  env: {
    ...process.env,
    HUSKY: 0
  }
}

export const GITHUB_OWNER = 'newrelic'
export const GITHUB_REPO = 'newrelic-browser-agent'
export const REPO_BASE = 'main'
export const PR_BRANCH_NAME = 'release-automation--browsers-update'

export const COMMIT_MESSAGE = 'chore: Post release repo updates'
export const PR_BODY = `When this PR is merged, caniuse-lite database is updated, latest browserslist for SauceLabs is retrieved, and third-party dependencies docs are updates.
---

This PR was generated with post-release-updates GitHub action.`
