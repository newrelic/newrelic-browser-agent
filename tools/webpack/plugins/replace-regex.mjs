import pkg from 'webpack'
const { sources } = pkg

/**
 * ReplaceRegexPlugin
 * Performs regex-based replacements on emitted webpack assets.
 *
 * Options:
 * - test: RegExp | (filename: string, content: string) => boolean
 * - replace: string | (match: string, ...args: any[]) => string
 * - include: RegExp | string[] (optional)
 * - exclude: RegExp | string[] (optional)
 */
export default class NRBAReplaceRegexPlugin {
  constructor (options = {}) {
    this.options = options
    this.pluginName = 'NRBAReplaceRegexPlugin'
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap(this.pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: this.pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE
        },
        (assets) => {
          const assetNames = Object.keys(assets)

          for (const filename of assetNames) {
            if (!this.shouldProcessFile(filename)) continue

            const asset = compilation.getAsset(filename)
            if (!asset) continue

            const originalSource = asset.source.source().toString()
            const updatedSource = this.applyRule(this.options, filename, originalSource)

            if (updatedSource !== originalSource) {
              compilation.updateAsset(
                filename,
                new sources.RawSource(updatedSource),
                asset.info
              )
            }
          }
        }
      )
    })
  }

  shouldProcessFile (filename) {
    const { include, exclude } = this.options

    if (exclude) {
      if (exclude instanceof RegExp && exclude.test(filename)) return false
      if (Array.isArray(exclude) && exclude.some((x) => this.matchStringOrRegExp(x, filename))) return false
    }

    if (include) {
      if (include instanceof RegExp) return include.test(filename)
      if (Array.isArray(include)) return include.some((x) => this.matchStringOrRegExp(x, filename))
      return this.matchStringOrRegExp(include, filename)
    }

    // Default: process all assets
    return true
  }

  matchStringOrRegExp (pattern, filename) {
    if (pattern instanceof RegExp) return pattern.test(filename)
    if (typeof pattern === 'string') return filename.includes(pattern)
    return false
  }

  applyRule (rule, filename, content) {
    const { test, replace } = rule || {}
    if (!test || !replace) return content

    let shouldRun = false
    let regex = null

    if (test instanceof RegExp) {
      regex = test
      shouldRun = regex.test(content)
    } else if (typeof test === 'function') {
      shouldRun = !!test(filename, content)
    }

    if (!shouldRun) return content

    if (regex) {
      if (typeof replace === 'function') {
        return content.replace(regex, (...args) => replace(...args))
      }
      return content.replace(regex, String(replace))
    }

    // When test is a function and returns true, apply replace via function or noop
    if (typeof replace === 'function') {
      // If using a function without a regex, call with (content, filename)
      const out = replace(content, filename)
      return typeof out === 'string' ? out : content
    }

    // No regex to anchor replacement, cannot perform deterministic replace
    return content
  }
}

/*
Usage example in webpack.config.js (ESM):

export default {
  // ...
  plugins: [
    new ReplaceRegexPlugin({
      // Rule: replace all occurrences of multiple newlines with a single newline
      test: /\n{2,}/g,
      replace: '\n',
      // Apply to all .js assets
      include: /\.js$/,
    }),
  ],
};
*/
