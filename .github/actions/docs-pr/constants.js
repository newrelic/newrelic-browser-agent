import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const DOCS_FORK_CLONE_PATH = path.resolve(__dirname, '.docs-git')

export const DOCS_SITE_GITHUB_OWNER = 'newrelic'
export const DOCS_SITE_GITHUB_REPO = 'docs-website'
export const DOCS_SITE_REPO_BASE = 'develop'
export const DOCS_SITE_FORK_GITHUB_OWNER = 'newrelic-forks'
export const DOCS_SITE_FORK_GITHUB_REPO = 'browser-agent-docs-website'

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

export const SUPPORT_STATEMENT =
  '## Support statement:' +
  '\n\n' +
  'New Relic recommends that you upgrade the agent regularly to ensure that you\'re getting the latest features and performance benefits. Older releases will no longer be supported when they reach [end-of-life](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/browser-agent-eol-policy/). Release dates are reflective of the original publish date of the agent version.' +
  '\n\n' +
  'New Browser Agent releases are rolled out to customers in small stages over a period of time. Because of this, the date the release becomes accessible to your account may not match the original publish date. Please see this [status dashboard](https://newrelic.github.io/newrelic-browser-agent-release/) for more information.'

export const ANDROID_CHROME_VERSION = 100 // for browser target statement; SauceLabs only offers one Android Chrome version
export const RELEASE_NOTES_PATH = 'src/content/docs/release-notes/new-relic-browser-release-notes/browser-agent-release-notes'
