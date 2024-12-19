import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import url from 'url'
import { args } from './args.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

try{
  const eventType = 'BuildSize'

  const packageJsonFile = fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8').trim()
  const version = JSON.parse(packageJsonFile).version

  Promise.all([
    fetch(`https://js-agent.newrelic.com/dev/nr-rum-standard.stats.json?_nocache=${uuidv4()}`),
    fetch(`https://js-agent.newrelic.com/dev/nr-full-standard.stats.json?_nocache=${uuidv4()}`),
    fetch(`https://js-agent.newrelic.com/dev/nr-spa-standard.stats.json?_nocache=${uuidv4()}`)
  ])
  .then(responses => Promise.all(responses.map(response => response.json())))
  .then(([lite, pro, spa]) => {
    const isMinifiedJs = (asset) => asset.label.includes('.min.js')
    const minifiedAssets = [...lite.filter(isMinifiedJs), ...pro.filter(isMinifiedJs), ...spa.filter(isMinifiedJs)]

    const objectsToReport = minifiedAssets.map((asset) => ({
      eventType,
      version,
      lastCommit: args.branchName,
      fileName: asset.label,
      fileSize: asset.parsedSize,
      gzipSize: asset.gzipSize,
      isLoader: !!(Object.keys(asset.isInitialByEntrypoint).length)
    }))

    fetch('https://staging-insights-collector.newrelic.com/v1/accounts/550352/events', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Api-Key': args.nrApiKey
      },
      body: JSON.stringify(objectsToReport)
    })
    .then((r) => r.json())
    .then((r) => {
      if (Object.keys(r).length) console.log('uploaded results to NR', r)
      else errorHandler('no response from NR request')
    })
    .catch(errorHandler)
  })
  .catch(errorHandler)
} catch (error) {
  errorHandler(error)
}

function errorHandler(error) {
  console.log('error uploading results to NR --', error)
}