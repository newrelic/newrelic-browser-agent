/**
 * Webpack plugin that checks loader files for any character sequences
 * that are known to break APM injection. If found, an error is registered
 * in the compilation and the compilation process will end with a non-zero
 * status code.
 */
export default class NRBALoaderApmCheckPlugin {
  #pluginName = 'NRBALoaderApmCheckPlugin'

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

              const matches = Array.from(source.matchAll(/\$&/g))
              for (const match of matches) {
                const error = new compilation.compiler.webpack.WebpackError(`Character sequence known to break APM injection detected: ${match[0]}`)
                error.file = assetKey
                compilation.errors.push(error)
              }
            })
        }
      )
    })
  }
}
