const fs = require('fs')
const path = require('path')

const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir)

function removeNonASCII (fileName, text) {
  const nonAsciiChars = /[^\x00-\x7F]/g
  const matches = (text.match(nonAsciiChars) || []).length
  if (!matches) return
  console.log(matches, 'Non-ASCII chars found in', fileName)
  const newText = text.replace(nonAsciiChars, '')
  return fs.promises.writeFile(`${buildDir}/${fileName}`, newText)
}

function prependSemicolon (fileName, text) {
  const newText = ';' + text
  return fs.promises.writeFile(`${buildDir}/${fileName}`, newText)
}

(async () => {
  const files = await Promise.all(builtFileNames.map(fileName => {
    return fs.promises.readFile(`${buildDir}/${fileName}`, 'utf-8')
  }))

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

  const fuzzyMajor = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    const content = f
    if (fileName.startsWith('nr-loader') && fileName.endsWith('.js')) {
      const pieces = fileName.split(/-(?=\d)/).map(x => x.split('.'))
      pieces[1] = pieces[1].map((v, i) => i === 1 || i === 2 ? 'x' : v).join('.')
      const major = pieces.join('-')
      return prependSemicolon(major, content)
    }
    return Promise.resolve()
  }))

  const fuzzyMinor = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    const content = f
    if (fileName.startsWith('nr-loader') && fileName.endsWith('.js')) {
      const pieces = fileName.split(/-(?=\d)/).map(x => x.split('.'))
      pieces[1] = pieces[1].map((v, i) => i === 2 ? 'x' : v).join('.')
      const minor = pieces.join('-')
      return prependSemicolon(minor, content)
    }
    return Promise.resolve()
  }))

  console.log(`Removed non ascii chars from ${removals.length} files`)
  console.log(`Prepended ; to ${prepended} files`)

  console.log(`Cloned ${fuzzyMajor.length} files for major fuzzy versions`)
  console.log(`Cloned ${fuzzyMinor.length} files for minor fuzzy versions`)
})()
