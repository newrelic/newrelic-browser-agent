import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/*
 * Next's static export has no template we control, so the test server's {init}/{config}
 * placeholders (see tools/testing-server/plugins/agent-injector) are added after the build.
 * They go first in <head> so NREUM exists before any of Next's scripts run.
 */
const indexPath = path.resolve(__dirname, '../../../../tests/assets/test-builds/frameworks/nextjs/index.html')
const PLACEHOLDERS = '{init}{config}'

if (!fs.existsSync(indexPath)) {
  console.error(`[inject-placeholders] ${indexPath} not found - did next build export to the right place?`)
  process.exit(1)
}

const html = fs.readFileSync(indexPath, 'utf-8')

// Safe to re-run: don't inject twice
if (html.includes(PLACEHOLDERS)) {
  console.log('[inject-placeholders] placeholders already present, skipping')
  process.exit(0)
}

const headOpen = /<head[^>]*>/
if (!headOpen.test(html)) {
  console.error('[inject-placeholders] no <head> tag found in index.html')
  process.exit(1)
}

fs.writeFileSync(indexPath, html.replace(headOpen, match => `${match}${PLACEHOLDERS}`))
console.log('[inject-placeholders] injected {init}{config} into index.html')
