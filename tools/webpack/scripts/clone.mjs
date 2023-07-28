import path from 'path'
import url from 'url'
import fs from 'fs-extra'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../../../build/')

;(async () => {
  const builtFileNames = await fs.readdirSync(buildDir)

  const files = await Promise.all(builtFileNames.map(fileName => {
    return fs.promises.readFile(`${buildDir}/${fileName}`, 'utf-8')
  }))

  const fuzzyMajor = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    // Assuming the filename contains a semantic version pattern, "-#.#.#.", replace the minor and patch numbers.
    const allMinorAndPatch = fileName.replace(/(^nr-loader.*-\d+\.)(\d+)\.(\d+)(.*\.js$)/, '$1x.x$4')
    if (allMinorAndPatch !== fileName) { // we only get a different string back if the filename has that pattern, in which case we'll create the respective "fuzzy" file
      return fs.writeFile(`${buildDir}/${allMinorAndPatch}`, f)
    }
    return Promise.resolve()
  }))

  const fuzzyMinor = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    // Assuming the filename contains a semantic version pattern, "-#.#.#.", replace the patch number.
    const allPatch = fileName.replace(/(^nr-loader.*-\d+\.\d+\.)(\d+)(.*\.js$)/, '$1x$3')
    if (allPatch !== fileName) { // we only get a different string back if the filename has that pattern, in which case we'll create the respective "fuzzy" file
      return fs.writeFile(`${buildDir}/${allPatch}`, f)
    }
    return Promise.resolve()
  }))

  console.log(`Processed ${fuzzyMajor.length} files for major fuzzy versions`)
  console.log(`Processed ${fuzzyMinor.length} files for minor fuzzy versions`)
})()
