import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const DOCS_CLONE_PATH = path.resolve(__dirname, '.docs-git')

export const DOCS_SITE_GITHUB_OWNER = 'newrelic'
export const DOCS_SITE_GITHUB_REPO = 'docs-website'
export const DOCS_SITE_REPO_BASE = 'develop'
export const CHANGELOG_FILE_NAME = 'changelog.json'
export const CHANGELOG_FILE_PATH = path.resolve(
  __dirname,
  '../../../',
  CHANGELOG_FILE_NAME
)

export const BROWSER_SUPPORT_LIST_FILE_PATH = path.resolve(
  __dirname,
  '../../../tools/browsers-lists/browsers-supported.json'
)

export const ANDROID_CHROME_VERSION = 100 // for browser target statement; SauceLabs only offers one Android Chrome version
export const RELEASE_NOTES_PATH = 'src/content/docs/release-notes/new-relic-browser-release-notes/browser-agent-release-notes'
