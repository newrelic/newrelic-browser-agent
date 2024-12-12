import process from 'process'
import path from 'path'
import url from 'url'
import fs from 'fs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const targetDir = path.resolve(__dirname, '../../tests/webview-specs/assets')
const outputDir = path.resolve(__dirname, '../../tools/lambda-test')

function uploadFile (name, path) {
  const file = fs.readFileSync(path)
  const form = new FormData()
  form.append('visibilty', 'team')
  form.append('name', name)
  form.append('appFile', new File([file], path))

  console.log('got file for', name, path, file)

  return fetch('https://manual-api.lambdatest.com/app/upload/virtualDevice', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${process.env.LAMBDA_USERNAME}:${process.env.LAMBDA_ACCESS_KEY}`)
    },
    body: form
  })
}

Promise.all([
  uploadFile('app-debug.apk', `${targetDir}/app-debug.apk`),
  uploadFile('NRTestApp.zip', `${targetDir}/NRTestApp.zip`)
])
  .then(([androidResponse, iosResponse]) => Promise.all([androidResponse.json(), iosResponse.json()]))
  .then(([androidResponse, iosResponse]) => {
    console.log('got response', androidResponse, iosResponse)
    fs.writeFileSync(`${outputDir}/webview-asset-ids.mjs`, `export default { androidID: '${androidResponse.app_url}', iosID: '${iosResponse.app_url}' }\n`)
  }).catch(errorMessage => {
    console.log(errorMessage)
    process.exit(1)
  })
