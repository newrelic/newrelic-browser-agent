const request = require('request')
const {connectToS3, uploadToS3} = require('./s3')

var argv = require('yargs')
  .usage('$0 [options]')

  .string('env')
  .alias('env', 'environment')
  .describe('env', 'NR Internal Environment')
  .default('env', 'dev')

  .string('config')
  .describe('NR internal config block')

  .string('files')
  .describe('comma delimited string of CDN file paths')

  .string('bucket')
  .describe('bucket', 'S3 bucket name')

  .string('role')
  .describe('role', 'S3 role ARN')
  .argv


const { env, files, config, bucket, role } = argv

let counter = 0

if (!env || !files || !config || !bucket || !role) {
  console.log("missing required param")
  process.exit(1)
}

const filePaths = files.split(",")
Promise.all(filePaths.map(fp => getFile(fp))).then((contents) => {
  let output = `window.NREUM=${config};`
  contents.forEach(([url, res, body]) => { output += wrapAgent(body) })
  output += randomExecutor(contents.length)

  const filename = `internal/${env}.js`

  connectToS3(role).then(async () => {
    const uploads = await uploadToS3(filename, output, bucket)
    console.log(`Successfully uploaded ${filename} to S3`)
    process.exit(0)
  }).catch(err => {
    console.log(err)
    process.exit(1)
  })
})

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
  for (var i = 0; i < fnCount; i++) {
    output += `if (r < ${((i + 1) / fnCount) + 0.00001}) return agent${i}();\n`
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