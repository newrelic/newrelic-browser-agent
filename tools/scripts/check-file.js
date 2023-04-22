const yargs = require('yargs')
const request = require('request')

const argv = yargs
  .array('paths')
  .describe('paths', 'list of CDN paths to check')
  .alias('paths', 'p')

  .help('h')
  .alias('h', 'help')

  .argv

const { paths } = argv

if (!paths) {
  console.log('missing paths')
  process.exit(1)
}

(async () => {
  try {
    const files = await Promise.all(paths.map(path => getFile(path)))
    if (files.every(([path, res, body]) => !!body && res.statusCode === 200)) {
      console.log('All paths exist on CDN :)')
      process.exit(0)
    } else {
      fail('<Status Code> or <Body> indicated an empty response')
    }
  } catch (err) {
    fail(err)
  }
})()

function fail (err) {
  console.log('error...', err)
  console.log('Could not verify all paths on CDN :(')
  process.exit(1)
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
