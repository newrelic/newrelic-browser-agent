const yargs = require('yargs')
const request = require('request')

const argv = yargs
  .string('v')
  .describe('v', 'The version of the loader to check in NRDB')

  .argv

const version = argv['v']

if (!version) {
  console.log('version required...')
  process.exit(1)
}

var opts = {
  uri: 'https://staging-api.newrelic.com/v2/js_agent_loaders/version.json',
  method: 'GET',
  gzip: true,
  qs: { loader_version: `nr-loader-spa-${version}.min.js` }
}

request(opts, (err, res, body) => {
  try {
    if (err || JSON.parse(body)?.error) {
      console.log(`Failed to Find ${version}...`)
      process.exit(1)
    }
    console.log(`${version} Exists in NRDB...`)
    process.exit()
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
})
