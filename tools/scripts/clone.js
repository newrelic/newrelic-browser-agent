const fs = require('fs')
const path = require('path')

const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir)

function prependSemicolon (fileName, text) {
  const newText = ';' + text
  return fs.promises.writeFile(`${buildDir}/${fileName}`, newText)
}

(async () => {
  const files = await Promise.all(builtFileNames.map(fileName => {
    return fs.promises.readFile(`${buildDir}/${fileName}`, 'utf-8')
  }))

  const fuzzyMajor = await Promise.all(files.map((f, i) => {
    const fileName = builtFileNames[i]
    const content = f
    if (fileName.startsWith('nr-loader') && fileName.endsWith('.js')) {
      const pieces = fileName.split(/-(?=\d)/).map(x => x.split('.'))
      if (!pieces[1]) return Promise.resolve()
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
      if (!pieces[1]) return Promise.resolve()
      pieces[1] = pieces[1].map((v, i) => i === 2 ? 'x' : v).join('.')
      const minor = pieces.join('-')
      return prependSemicolon(minor, content)
    }
    return Promise.resolve()
  }))

  console.log(`Processed ${fuzzyMajor.length} files for major fuzzy versions`)
  console.log(`Processed ${fuzzyMinor.length} files for minor fuzzy versions`)
})()
