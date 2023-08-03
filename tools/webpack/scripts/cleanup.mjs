/* eslint-disable no-control-regex */

import path from 'path'
import url from 'url'
import fs from 'fs-extra'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../../../build/')

async function removeNonASCII (fileName, content) {
  const nonAsciiChars = /[^\x00-\x7F]/g
  const matches = (content.match(nonAsciiChars) || []).length
  if (!matches) return

  console.log(matches, 'Non-ASCII chars found in', fileName)
  const newText = content.replace(nonAsciiChars, '')
  await fs.writeFile(`${buildDir}/${fileName}`, newText)
}

async function prependSemicolon (fileName, text) {
  const newText = ';' + text
  await fs.writeFile(`${buildDir}/${fileName}`, newText)
}

(async () => {
  const builtFileNames = await fs.readdir(buildDir)

  const files = await Promise.all(builtFileNames.map(fileName => {
    return fs.readFile(`${buildDir}/${fileName}`, 'utf-8')
  }))

  files.forEach((contents, i) => {
    if (builtFileNames[i].includes('-loader') && builtFileNames[i].endsWith('.js')) {
      const matches = contents.match(/\$&/)
      if (Array.isArray(matches) && matches.length > 0) {
        throw new Error(`Loader file ${builtFileNames[i]} contains a character sequence that could break injection due to string replacement: ${JSON.stringify(matches)}`)
      }
    }
  })

  let prepended = 0
  await Promise.all(files
    .map((f, i) => {
      if (builtFileNames[i].includes('-loader') && builtFileNames[i].endsWith('.js')) {
        const fileName = builtFileNames[i]
        const content = f
        prepended++
        return prependSemicolon(fileName, content)
      } else return Promise.resolve()
    }))

  const removals = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    const content = f
    return removeNonASCII(fileName, content)
  }))

  console.log(`Removed non ascii chars from ${removals.length} files`)
  console.log(`Prepended ; to ${prepended} files`)
})()
