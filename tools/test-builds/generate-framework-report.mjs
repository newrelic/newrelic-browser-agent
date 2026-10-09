import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const resultsDir = path.resolve(__dirname, '../../.framework-results')

// Report is suffixed with the agent (root package.json) version so each release keeps its own
// asset in the bucket instead of overwriting a single shared file.
const agentPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'))
const outFile = path.join(resultsDir, `report-${agentPkg.version}.html`)

// Keep this in sync with the FEATURE_CHECKS names used by tests/framework-specs/**/*.e2e.js
const FEATURES = [
  'page_view_event',
  'page_view_timing',
  'metrics',
  'session_trace',
  'session_replay',
  'soft_navigations',
  'ajax',
  'jserrors',
  'logging',
  'generic_events'
]

const rows = (fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir) : [])
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf-8')))

const cell = (row) => (feature) => {
  const passed = !!row.results?.[feature]
  return `<td class="${passed ? 'pass' : 'fail'}">${passed ? '✓' : '✗'}</td>`
}

// Rows are one framework in one browser. LambdaTest browsers and local runtimes (electron) are
// reported in separate tables, each ordered by browser then framework.
const byBrowserThenFramework = (a, b) => `${a.browser} ${a.browserVersion}`.localeCompare(`${b.browser} ${b.browserVersion}`, undefined, { numeric: true }) ||
  a.framework.localeCompare(b.framework)
const agentVersion = [...new Set(rows.map(row => row.agentVersion).filter(Boolean))].join(', ') || 'unknown'

const table = (title, tableRows) => tableRows.length === 0
  ? ''
  : `<h2>${title}</h2>
  <table>
    <thead>
      <tr>
        <th>Browser</th>
        <th>Framework</th>
        ${FEATURES.map(f => `<th>${f}</th>`).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${tableRows.sort(byBrowserThenFramework).map(row => `<tr>
        <td class="browser">${[row.browser, row.browserVersion].filter(Boolean).join(' ')}</td>
        <td class="framework">${row.framework} ${row.version}</td>
        ${FEATURES.map(cell(row)).join('\n        ')}
      </tr>`).join('\n      ')}
    </tbody>
  </table>`

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Framework Informational Test Report</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; margin: 2rem; background: #fff; color: #111; }
  h1 { font-size: 1.25rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: center; }
  th { background: #f5f5f5; }
  td.pass { color: #1a7f37; font-weight: bold; }
  td.fail { color: #cf222e; font-weight: bold; }
  td.framework, td.browser { text-align: left; font-weight: 600; }
  h2 { font-size: 1.05rem; margin-top: 1.5rem; }
  .timestamp { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
  .run-info { margin-bottom: 1rem; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Framework Informational Test Report</h1>
  <div class="timestamp">Generated ${new Date().toISOString()}</div>
  <div class="run-info">
    <div><strong>Browser Agent version:</strong> ${agentVersion}</div>
  </div>
  ${table('Browsers', rows.filter(row => !row.local))}
  ${table('Local runtimes', rows.filter(row => row.local))}
</body>
</html>
`

fs.mkdirSync(resultsDir, { recursive: true })
fs.writeFileSync(outFile, html)
console.log(`[generate-framework-report] wrote ${outFile} (${rows.length} framework row(s))`)
