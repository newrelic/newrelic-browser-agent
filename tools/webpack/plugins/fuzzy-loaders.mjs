import fs from 'node:fs'
import path from 'node:path'

/**
 * Webpack plugin that generates fuzzy version matching loader files
 * after a compilation has emitted its files. This will only apply
 * when the loader files name contains a properly formatted semver.
 */
export default class NRBAFuzzyLoadersPlugin {
  #pluginName = 'NRBAFuzzyLoadersPlugin'

  /**
   * @param compiler {import('webpack/lib/Compiler.js').default}
   */
  apply (compiler) {
    compiler.hooks.assetEmitted.tapPromise(this.#pluginName, async (file, { content, outputPath }) => {
      await this.#writeFuzzyMinor(file, outputPath, content)
      await this.#writeFuzzyMajor(file, outputPath, content)
    })
  }

  /**
   * If the file is a loader with a version number, write a new file using
   * the same name with the third version octet replaced with an x as a wildcard.
   * @param file {string}
   * @param outputPath {string}
   * @param content {string | Buffer}
   * @return {Promise<void>}
   */
  async #writeFuzzyMinor (file, outputPath, content) {
    // Assuming the filename contains a semantic version pattern, "-#.#.#.", replace the minor and patch numbers.
    const allPatch = file.replace(/(^nr-loader.*-\d+\.\d+\.)(\d+)(.*\.js$)/, '$1x$3')
    if (allPatch !== file) { // we only get a different string back if the filename has that pattern, in which case we'll create the respective "fuzzy" file
      await fs.promises.writeFile(path.join(outputPath, allPatch), content)
    }
  }

  /**
   * If the file is a loader with a version number, write a new file using
   * the same name with the second and third version octets replaced with
   * an x as a wildcard.
   * @param file {string}
   * @param outputPath {string}
   * @param content {string | Buffer}
   * @return {Promise<void>}
   */
  async #writeFuzzyMajor (file, outputPath, content) {
    // Assuming the filename contains a semantic version pattern, "-#.#.#.", replace the minor and patch numbers.
    const allMinorAndPatch = file.replace(/(^nr-loader.*-\d+\.)(\d+)\.(\d+)(.*\.js$)/, '$1x.x$4')
    if (allMinorAndPatch !== file) { // we only get a different string back if the filename has that pattern, in which case we'll create the respective "fuzzy" file
      await fs.promises.writeFile(path.join(outputPath, allMinorAndPatch), content)
    }
  }
}
