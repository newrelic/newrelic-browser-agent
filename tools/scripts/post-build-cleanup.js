const fs = require('fs')
const path = require('path')

const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir);

function removeNonASCII(fileName, text) {
    const nonAsciiChars = /[^\x00-\x7F]/g
    const matches = (text.match(nonAsciiChars) || []).length
    if (!matches) return
    console.log(matches, "Non-ASCII chars found in", fileName)
    const newText = text.replace(nonAsciiChars, "");
    return fs.promises.writeFile(`${ buildDir }/${fileName}`, newText)
}

(async () => {
    const files = await Promise.all(builtFileNames.map(fileName => {
        return fs.promises.readFile(`${buildDir}/${fileName}`, 'utf-8')
    }))

    const removals = await Promise.all(files.map((f, i) => {
        const fileName = builtFileNames[i]
        const content = f
        return removeNonASCII(fileName, content)
    }))
    
    console.log(`Removed non ascii chars from ${removals.length} files`)
})()