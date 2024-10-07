import process from 'process'
import path from 'path'
import url from 'url'
import fs from 'fs'

import { exec } from 'child_process'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const targetDir = path.resolve(__dirname, '../../tests/webview-specs/assets')
const outputDir = path.resolve(__dirname, '../../tools/lambda-test')

const androidUpload = `curl -u "${process.env.LT_USERNAME}:${process.env.LT_ACCESS_KEY}" --location --request POST 'https://manual-api.lambdatest.com/app/upload/virtualDevice' --form "visibilty=team" --form 'name="app-debug.apk"' --form 'appFile=@"${targetDir}/app-debug.apk"'`
const iosUpload = `curl -u "${process.env.LT_USERNAME}:${process.env.LT_ACCESS_KEY}" --location --request POST 'https://manual-api.lambdatest.com/app/upload/virtualDevice' --form "visibilty=team" --form 'name="NRTestApp.apk"' --form 'appFile=@"${targetDir}/NRTestApp.zip"'`

let androidID = null; let iosID = null

exec(androidUpload, (error, stdout, stderr) => {
  if (error) return errorResult(error)
  androidID = JSON.parse(stdout).app_url
  checkDone()
})

exec(iosUpload, (error, stdout, stderr) => {
  if (error) return errorResult(error)
  iosID = JSON.parse(stdout).app_url
  checkDone()
})

function checkDone () {
  if (androidID && iosID) {
    console.log('uploaded...', androidID, iosID)
    fs.writeFileSync(`${outputDir}/webview-asset-ids.mjs`, `export default { androidID: '${androidID}', iosID: '${iosID}' }\n`)
    process.exit()
  }
}

function errorResult (errorMessage) {
  console.log(errorMessage)
  process.exit(1)
}
