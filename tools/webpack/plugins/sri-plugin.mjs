import crypto from 'node:crypto'

/**
 * Webpack plugin that injects a sha512 hash into the webpack runtime template
 * for each of the async chunks allowing the chunks to be loaded with integrity
 * hash attributes.
 */
export default class NRBASubresourceIntegrityPlugin {
  #pluginName = 'NRBASubresourceIntegrityPlugin'
  #sriHashVariableReference = 'sriHashes'
  #templatePlaceholder = '*-*-*-CHUNK-SRI-HASH'
  #hashCache = new Map()
  #inverseHashCache = new Map()
  #chunkAssetMap = new Map()

  /**
   * @param compiler {import('webpack/lib/Compiler.js').default}
   */
  apply (compiler) {
    compiler.hooks.thisCompilation.tap(this.#pluginName, (compilation) => {
      /**
       * Inject the sri placeholder and code into the webpack template.
       */
      compilation.compiler.webpack.runtime.LoadScriptRuntimeModule.getCompilationHooks(compilation).createScript.tap(this.#pluginName, source => {
        return this.#generateTemplatePlaceholder(compilation, source)
      })

      /**
       * After the assets have been processed, inject the calculated hashes into the
       * runtime chunks.
       */
      compilation.hooks.afterProcessAssets.tap(this.#pluginName, assets => {
        this.#hashCompilation(compilation, assets)
        this.#updateRuntimes(compilation, assets)
      })
    })
  }

  /**
   * Alters the script loading code from the LoadScriptRuntimeModule to include
   * an array of SRI hashes and code to add the hash to the script integrity
   * property.
   * @param compilation {import('webpack/lib/Compilation.js').default}
   * @param source {string}
   * @return {string}
   */
  #generateTemplatePlaceholder (compilation, source) {
    const asyncChunks = Array.from(compilation.chunks)
      .filter(chunk => !chunk.hasRuntime())

    return compilation.compiler.webpack.Template.asString([
      `var ${this.#sriHashVariableReference} = {`,
      compilation.compiler.webpack.Template.indent(
        asyncChunks
          .map(chunk => `'${chunk.id}':'${this.#templatePlaceholder}:${chunk.id}'`)
          .join(',')
      ),
      '};',
      source,
      `if (${this.#sriHashVariableReference}[chunkId]) {`,
      compilation.compiler.webpack.Template.indent([
        `script.integrity = ${this.#sriHashVariableReference}[chunkId];`
      ]),
      '}'
    ])
  }

  /**
   * Loop through all the assets of the compilation to hash
   * the asset content and cache it.
   * @param compilation {import('webpack/lib/Compilation.js').default}
   * @param assets {{[filePath: string]: import('webpack-sources/lib/Source.js').default}}
   */
  #hashCompilation (compilation, assets) {
    Array.from(compilation.chunks)
      .forEach(chunk => {
        for (const file of chunk.files) {
          if (this.#hashCache.has(chunk.id)) {
            return
          }

          const asset = assets[file]
          if (!asset) {
            return
          }

          const hash = this.#computeHash(asset.source())
          this.#updateHash(file, hash)
          this.#chunkAssetMap.set(file, chunk.id)
          this.#replaceAsset(compilation, file, null, hash)
        }
      })
  }

  #updateRuntimes (compilation, assets) {
    Array.from(compilation.chunks)
      .filter(chunk => chunk.hasRuntime())
      .forEach(chunk => {
        for (const file of chunk.files) {
          const asset = assets[file]

          if (!asset) {
            return
          }

          let source = asset.source()
          if (typeof source !== 'string') {
            source = source.toString('utf-8')
          }
          if (source.indexOf(this.#templatePlaceholder) === -1) {
            return
          }

          /**
           * Replace the asset source so the hash placeholder has values.
           */
          const newSource = new compilation.compiler.webpack.sources.ReplaceSource(asset, file)
          this.#chunkAssetMap.forEach((chunkId, assetKey) => {
            if (!this.#hashCache.has(assetKey)) {
              return
            }

            const placeholder = `${this.#templatePlaceholder}:${chunkId}`
            if (source.indexOf(placeholder) === -1) {
              return
            }

            const replacementStart = source.indexOf(placeholder)
            const replacementEnd = replacementStart + placeholder.length - 1
            newSource.replace(replacementStart, replacementEnd, this.#hashCache.get(assetKey), this.#pluginName)
          })

          assets[file] = newSource
          this.#replaceAsset(compilation, file, newSource, this.#computeHash(newSource.source()))
        }
      })
  }

  /**
   * Computes a hash of the input value.
   * @param input {string | Buffer}
   * @return {string}
   */
  #computeHash (input) {
    const hash = crypto.createHash('sha512')
      .update(typeof input === 'string' ? Buffer.from(input, 'utf-8') : input)
      .digest('base64')

    return `sha512-${hash}`
  }

  /**
   * Updates the hash cache.
   * @param assetKey {string}
   * @param hash {string}
   * @param [oldHash] {string}
   */
  #updateHash (assetKey, hash, oldHash) {
    if (oldHash) {
      this.#inverseHashCache.delete(oldHash)
    }

    this.#hashCache.set(assetKey, hash)
    this.#inverseHashCache.set(hash, assetKey)
  }

  /**
   * Replaces an asset in the current compilation with a new optional asset
   * source and force updates the hash of the asset.
   * @param compilation {import('webpack/lib/Compilation.js').default}
   * @param assetKey {string}
   * @param newSource {import('webpack-sources/lib/Source.js').default | null}
   * @param hash {string}
   */
  #replaceAsset (compilation, assetKey, newSource, hash) {
    if (!newSource) {
      newSource = existingSource => existingSource
    }

    compilation.updateAsset(assetKey, newSource, assetInfo => ({
      ...(assetInfo || {}),
      contenthash: Array.isArray(assetInfo?.contenthash)
        ? [...new Set([...assetInfo.contenthash, hash])]
        : assetInfo.contenthash
          ? [assetInfo.contenthash, hash]
          : hash
    }))
  }
}
