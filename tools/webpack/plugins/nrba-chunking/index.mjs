export default class NRBAChunkingPlugin {
  #options

  constructor (options) {
    this.#options = options
  }

  /**
   * @param {import('webpack/lib/Compiler')} compiler the webpack compiler
   * @returns {void}
   */
  apply (compiler) {
    compiler.hooks.compilation.tap('NRBAChunkingPlugin', compilation => {
      compilation.hooks.afterChunks.tap('NRBAChunkingPlugin', (chunks) => {
        const chunkGraph = compilation.chunkGraph
        const asyncChunks = Array.from(chunks)
          .filter(chunk => !chunk.isOnlyInitial() || ['recorder'].includes(chunk.name))

        if (asyncChunks.length === 0) {
          return
        }

        for (const chunk of asyncChunks) {
          if (chunkGraph.canChunksBeIntegrated(asyncChunks[0], chunk) && !['recorder', 'compressor'].includes(chunk.name)) {
            chunkGraph.integrateChunks(asyncChunks[0], chunk)
          } else if (['recorder', 'compressor'].includes(chunk.name)) {
            chunk.name = `${this.#options.asyncChunkName}-${chunk.name}`
          }
        }

        asyncChunks[0].name = this.#options.asyncChunkName
      })
    })
  }
}
