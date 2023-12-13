/**
 * Webpack plugin that prepends all loader files with a semicolon
 * to prevent issues with APM injection and Copy/Paste scripts.
 */
export default class NRBAPrependSemicolonPlugin {
  #pluginName = 'NRBAPrependSemicolonPlugin'

  /**
   * @param compiler {import('webpack/lib/Compiler.js').default}
   */
  apply (compiler) {
    compiler.hooks.thisCompilation.tap(this.#pluginName, (compilation) => {
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

              if (source.startsWith(';')) {
                return
              }

              compilation.updateAsset(assetKey, new compilation.compiler.webpack.sources.ConcatSource(
                new compilation.compiler.webpack.sources.RawSource(';'),
                assetSource
              ))
            })
        }
      )
    })
  }
}
