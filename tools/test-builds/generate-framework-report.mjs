import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const resultsDir = path.resolve(__dirname, '../../.framework-results')
const outFile = path.join(resultsDir, 'report.html')

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

// Every row comes from the same test run, so the agent version and browser under test are
// expected to be consistent across rows - fall back to listing distinct values if they aren't.
const summarize = (values) => {
  const distinct = [...new Set(values.filter(Boolean))]
  return distinct.length ? distinct.join(', ') : 'unknown'
}
const agentVersion = summarize(rows.map(row => row.agentVersion))
const browserUnderTest = summarize(rows.map(row => [row.browser, row.browserVersion].filter(Boolean).join(' ')))

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
  td.framework { text-align: left; font-weight: 600; }
  .timestamp { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
  .run-info { margin-bottom: 1rem; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Framework Informational Test Report</h1>
  <div class="timestamp">Generated ${new Date().toISOString()}</div>
  <div class="run-info">
    <div><strong>Browser Agent version:</strong> ${agentVersion}</div>
    <div><strong>Tested on:</strong> ${browserUnderTest}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Framework</th>
        ${FEATURES.map(f => `<th>${f}</th>`).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>
        <td class="framework">${row.framework} ${row.version}</td>
        ${FEATURES.map(cell(row)).join('\n        ')}
      </tr>`).join('\n      ')}
    </tbody>
  </table>
</body>
</html>
`

fs.mkdirSync(resultsDir, { recursive: true })
fs.writeFileSync(outFile, html)
console.log(`[generate-framework-report] wrote ${outFile} (${rows.length} framework row(s))`)
