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

export const BROWSER_LASTEST_VERSIONS_FILE_PATH = path.resolve(__dirname, '../../../tools/browsers-lists/lt-desktop-latest-vers.json')
export const MOBILE_VERSIONS_FILE_PATH = path.resolve(__dirname, '../../../tools/browsers-lists/lt-mobile-supported.json')

export const RELEASE_NOTES_PATH = 'src/content/docs/release-notes/new-relic-browser-release-notes/browser-agent-release-notes'
