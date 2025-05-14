export const webpackCacheGroup = (asyncChunkName = 'new-relic-browser-agent', matcher) => {
  if (!matcher) {
    matcher = (module, { chunkGraph }) => {
      if (!module.resource) return false
      if (!module.resource.match(/node_modules[\\/](@newrelic[\\/]browser-agent|web-vitals)[\\/]/)) return false
      return chunkGraph.getModuleChunks(module).filter(chunk => {
        return !['recorder', 'compressor'].includes(chunk.name)
      }).length > 0
    }
  }

  return {
    [asyncChunkName]: {
      name: asyncChunkName,
      enforce: true,
      reuseExistingChunk: true,
      test: matcher,
      chunks: 'async'
    }
  }
}

// roll-up, vite, esbuild etc.
