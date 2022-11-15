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

  .boolean('dry')
  .default('dry', false)
  .argv


const { env, appId, licenseKey, bucket, role, current, next, dry } = argv

let counter = 1

if (!env || !appId || !licenseKey || !bucket || !role) {
  console.log("missing required param")
  process.exit(1)
}

const config = {
  init: {
    distributed_tracing: {
      enabled: true,
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
    applicationID: `${appId}`,
  },

  info: {
    beacon: 'staging-bam.nr-data.net',
    errorBeacon: 'staging-bam.nr-data.net',
    licenseKey: `${licenseKey}`,
    applicationID: `${appId}`,
    sa: 1
  },
};

(async function () {
  const filePaths = [
    current, // defaults to current build
    ...(env !== 'dev' && [next]), // defaults to dev build
    ...(env === 'dev' && await getOpenPrNums()).map(num => `https://js-agent.newrelic.com/pr/PR-${num}/nr-loader-spa.min.js`),
  ]

  Promise.all(filePaths.map(fp => getFile(fp))).then((contents) => {
    contents = contents.filter(([url, res])=> res.statusCode === 200)
    if (!contents.length) throw new Error('Contents are empty')
    
    console.log(`found ${contents.length} valid PR builds in CDN`)
    let output = `window.NREUM=${JSON.stringify(config)};`
    contents.forEach(([url, res, body]) => { output += wrapAgent(body) })
    output += randomExecutor(contents.length)

    const filename = `internal/${env}.js`

    connectToS3(role, dry).then(async () => {
      const uploads = await uploadToS3(filename, output, bucket, dry, 300)
      console.log(`Successfully uploaded ${filename} to S3`)
      process.exit(0)
    }).catch(err => {
      console.log(err)
      process.exit(1)
    })
  }).catch(err => {
    console.log("error getting all files... ", err)
  })

})()

function wrapAgent(agent) {
  const agentNo = counter++
  return `
        function agent${agentNo}(){
            ${agent}
        }
    `
}

function randomExecutor(fnCount) {
  let output = `
        (function (){
            var r = Math.random();
    `
  for (var i = 1; i <= fnCount; i++) {
    output += `if (r <= ${i / fnCount}) return agent${i}();\n`
  }
  output += '})()'
  return output
}

function getFile(path) {
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

function getOpenPrNums() {
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