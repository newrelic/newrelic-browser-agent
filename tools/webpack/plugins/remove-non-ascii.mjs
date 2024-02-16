/**
 * Webpack plugin that removes non-ASCII characters from loader
 * files. These characters are known to cause issues with APM
 * injection.
 */
export default class NRBARemoveNonAsciiPlugin {
  #pluginName = 'NRBARemoveNonAsciiPlugin'
  // eslint-disable-next-line no-control-regex
  #nonAsciiChars = /[^\x00-\x7F]/

  /**
   * @param compiler {import('webpack/lib/Compiler.js').default}
   */
  apply (compiler) {
    compiler.hooks.thisCompilation.tap(this.#pluginName, (compilation) => {
      const logger = compilation.getLogger(this.#pluginName)

      compilation.hooks.processAssets.tap(
        {
          name: this.#pluginName,
          stage: compilation.compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE + 1,
          additionalAssets: true
        },
        (assets) => {
          Object.entries(assets)
            .filter(([assetKey]) => assetKey.indexOf('-loader') > -1 && assetKey.endsWith('.js'))
            .forEach(([assetKey, assetSource]) => {
              let source = assetSource.source()

              if (typeof source !== 'string') {
                source = source.toString('utf-8')
              }

              const matches = Array.from(source.matchAll(new RegExp(this.#nonAsciiChars, 'g')))
              if (matches.length === 0) {
                return
              }

              logger.info(`${matches.length} non-ascii characters found in ${assetKey}`)

              const newSource = new compilation.compiler.webpack.sources.ReplaceSource(assetSource, assetKey)
              for (const match of matches) {
                newSource.replace(match.index, match.index + match[0].length - 1, '', this.#pluginName)
              }
              compilation.updateAsset(assetKey, newSource)
            })
        }
      )
    })
  }
}
