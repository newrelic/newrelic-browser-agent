const yargs = require('yargs')
const request = require('request')

const argv = yargs
  .string('v')
  .describe('v', 'The version of the loader to check in NRDB')

  .argv

const version = argv.v

if (!version) {
  console.log('version required...')
  process.exit(1)
}

const urls = [
  'https://staging-api.newrelic.com/v2/js_agent_loaders/version.json',
  'https://api.newrelic.com/v2/js_agent_loaders/version.json'
  // 'https://api.eu.newrelic.com/v2/js_agent_loaders/version.json'
]

var opts = {
  method: 'GET',
  gzip: true,
  qs: { loader_version: `nr-loader-spa-${version}.min.js` }
}

urls.forEach(url => {
  request({ ...opts, uri: url }, (err, res, body) => {
    try {
      if (err || JSON.parse(body)?.error) {
        console.log(`Failed to Find ${version}...`)
        process.exit(1)
      }
      console.log(`${version} Exists in ${url}...`)
    } catch (e) {
      console.log(e)
      process.exit(1)
    }
  })
})
