const path = require('path')
const fs = require('fs')

/**
 * Recursively lists all files in a directory and it's subdirectories
 * @param {string} directory Directory to start listing files
 * @async
 * @returns {Generator<string>} File path in directory
 */
module.exports = async function * getFiles (directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const res = path.resolve(directory, entry.name)

    if (entry.isDirectory()) {
      yield * getFiles(res)
    } else {
      yield res
    }
  }
}
