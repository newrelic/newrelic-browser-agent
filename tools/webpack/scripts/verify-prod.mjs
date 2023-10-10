import path from 'path'
import url from 'url'
import fs from 'fs-extra'
import process from 'process'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../../../build/')

const builtFileNames = await fs.readdir(buildDir)

const files = await Promise.all(builtFileNames.map(async fileName => {
  return { fileName, contents: await fs.readFile(`${buildDir}/${fileName}`, 'utf-8') }
}))

console.log('Verifying develblock removal')
let develblocksPresent = false
files.forEach(({ fileName, contents }, i) => {
  if (contents.toLowerCase().indexOf('develblock') > -1) {
    console.error(`Found develblock in file ${fileName}`)
    develblocksPresent = true
  }
})
if (develblocksPresent) {
  console.error('Production build failed: develblock present in files')
  process.exit(1)
}
