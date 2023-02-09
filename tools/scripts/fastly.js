const request = require('request')
var argv = require('yargs')
  .string('fastly-key')
  .describe('fastly-key', 'Fastly API Key for purging cache')

  .string('env')
  .alias('env', 'environment')
  .describe('env', 'NR Internal Environment')
  .default('env', 'dev')
  .choices('env', ['dev', 'staging', 'prod', 'eu-prod'])

  .boolean('purge-internal')
  .describe('purge-internal', 'Purge fastly cache for internal env url')
  .default('purge-internal', false)

  .string('purge-path')
  .describe('purge-path', 'CDN Path to purge').argv

const { fastlyKey, env, purgeInternal, purgePath } = argv

const fastlyRoot = 'https://api.fastly.com/purge/js-agent.newrelic.com'

if (!fastlyKey) {
  console.log('must supply fastly key')
  process.exit(1)
}

(async () => {
  try {
    if (purgeInternal) await purge(`internal/${env}.js`)
    if (purgePath) await purge(purgePath)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})()

async function purge (path) {
  var opts = {
    uri: `${fastlyRoot}/${path}`,
    method: 'POST',
    headers: {
      'Fastly-Soft-Purge': '1',
      'Fastly-Key': fastlyKey,
      Accept: 'application/json'
    }
  }

  console.log('purging... ', path)

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        console.log(res.statusCode)
        reject(err)
        return
      }
      console.log('purge complete')
      resolve()
    })
  })
}
