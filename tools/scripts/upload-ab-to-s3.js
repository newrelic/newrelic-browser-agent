const request = require('request')
const { connectToS3, uploadToS3 } = require('./s3')

var argv = require('yargs')
  .usage('$0 [options]')

  .string('env')
  .alias('env', 'environment')
  .describe('env', 'NR Internal Environment')
  .default('env', 'dev')
  .choices('env', ['dev', 'staging', 'prod', 'eu-prod'])

  .string('current')
  .describe('current', 'current/stable build (defaults to -current)')
  .default('current', 'https://js-agent.newrelic.com/nr-loader-spa-current.min.js')

  .string('next')
  .describe('next', 'next version to compare to stable version (defaults to /dev)')
  .default('next', 'https://js-agent.newrelic.com/dev/nr-loader-spa.min.js')

  .string('licenseKey')
  .describe('licenseKey', 'NR internal licenseKey')

  .string('appId')
  .describe('appId', 'NR internal appId')

  .string('bucket')
  .describe('bucket', 'S3 bucket name')

  .string('role')
  .describe('role', 'S3 role ARN')

  .string('sha')
  .describe('sha', 'github action SHA')
  .default('sha', '')

  .string('workflow')
  .describe('workflow', 'github action workflow')
  .default('workflow', '')

  .boolean('dry')
  .default('dry', false)
  .argv

const { env, appId, licenseKey, bucket, role, current, next, dry, sha, workflow } = argv

let counter = 1

if (!env || !appId || !licenseKey || !bucket || !role) {
  console.log('missing required param')
  if (!env) console.log('env')
  if (!appId) console.log('appId')
  if (!licenseKey) console.log('licenseKey')
  if (!bucket) console.log('bucket')
  if (!role) console.log('role')
  process.exit(1)
}

const config = {
  init: {
    distributed_tracing: {
      enabled: true
    },
    ajax: {
      deny_list: [
        'nr-data.net',
        'bam.nr-data.net',
        'staging-bam.nr-data.net',
        'bam-cell.nr-data.net'
      ]
    }
  },

  loader_config: {
    accountID: '1',
    trustKey: '1',
    agentID: `${appId}`,
    licenseKey: '0986481b53',
    applicationID: `${appId}`
  },

  info: {
    beacon: 'staging-bam.nr-data.net',
    errorBeacon: 'staging-bam.nr-data.net',
    licenseKey: `${licenseKey}`,
    applicationID: `${appId}`,
    sa: 1,
    agent: 'https://js-agent.newrelic.com/nr-spa-1216.min.js' // legacy remnant for backwards compat
  }
}

function getIdFromUrl (url) {
  if (url.includes('PR-')) return 'PR-' + url.split('/').find(x => x.includes('PR-')).split('-')[1]
  if (url.includes('/dev/')) return 'dev'
  if (url.includes('-current')) return 'current'
  if (url.match(/\d+/)) return url.match(/\d+/)[0]
  return `${counter++}`
}

(async function () {
  const filePaths = [
    ...(env !== 'dev' ? [current] : []), // defaults to current build
    next, // defaults to dev build
    ...(env === 'dev' && await getOpenPrNums() || []).map(num => `https://js-agent.newrelic.com/pr/PR-${num}/nr-loader-spa.min.js`)
  ]

  Promise.all(filePaths.map(fp => getFile(fp))).then((contents) => {
    contents = contents.filter(([url, res]) => res.statusCode === 200)
    if (!contents.length) throw new Error('Contents are empty')

    console.log(`found ${contents.length} valid PR builds in CDN`)
    let output = `window.NREUM=${JSON.stringify(config)};`
    output += `
      const ids = {};
    `
    contents.forEach(([url, res, body]) => { output += wrapAgent(body, getIdFromUrl(url)) })
    output += randomExecutor(contents.map(([url]) => getIdFromUrl(url)))

    const filename = `internal/${env}.js`

    connectToS3(role, dry).then(async () => {
      const expires = new Date()
      expires.setMonth(expires.getMonth() + 1)

      const uploads = await uploadToS3(filename, output, bucket, dry, 300, expires.toISOString())
      console.log(`Successfully uploaded ${filename} to S3`)
      process.exit(0)
    }).catch(err => {
      console.log(err)
      process.exit(1)
    })
  }).catch(err => {
    console.log('error getting all files... ', err)
  })
})()

function wrapAgent (agent, id) {
  return `
        ids['${id}'] = () => {
            ${agent}
            ;newrelic.setCustomAttribute('buildID', '${id}')
            ;newrelic.setCustomAttribute('SHA', '${sha}')
            ;newrelic.setCustomAttribute('workflow', '${workflow}');
        }
    `
}

function randomExecutor (ids) {
  let output = `
        (function (){
          const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
          });
          if (params.nrbaloader && ids[params.nrbaloader]) return ids[params.nrbaloader]();

          const ls = localStorage.getItem("nrbaloader")
          if (ls && ids[ls]) return ids[ls]();
          
          var r = Math.random();
    `
  ids.forEach((id, i) => {
    output += `if (r <= ${(i + 1) / ids.length}) return ids['${id}']();\n`
  })
  output += '})()'
  return output
}

function getFile (path) {
  var opts = {
    uri: path,
    method: 'GET',
    gzip: true
  }

  console.log('downloading ', path)

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err) {
        reject(err)
        return
      }
      resolve([path, res, body])
    })
  })
}

function getOpenPrNums () {
  var opts = {
    uri: 'https://api.github.com/repos/newrelic/newrelic-browser-agent/pulls?state=open',
    method: 'GET',
    headers: {
      'User-Agent': 'newrelic-browser-agent'
    }
  }

  return new Promise((resolve, reject) => {
    request(opts, (err, res, body) => {
      if (err) {
        reject(err)
        return
      }
      const prNums = JSON.parse(body).map(pr => pr.number)
      resolve(prNums)
    })
  })
}
