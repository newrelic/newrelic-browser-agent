const {
  expandLoaderFileNames,
  resolveLoaderFileNames
} = require('../../../.github/actions/shared-utils/loaders.js')

describe('github actions loader filename resolution', () => {
  test('uses numbered loader filenames when a loader version is provided directly', async () => {
    const result = await resolveLoaderFileNames({ loaderVersion: '1.317.0' })

    expect(result.loaderVersion).toBe('1.317.0')
    expect(result.loaderFileNames).toEqual([
      'nr-loader-rum-1.317.0.min.js',
      'nr-loader-rum-1.317.0.js',
      'nr-loader-full-1.317.0.min.js',
      'nr-loader-full-1.317.0.js',
      'nr-loader-spa-1.317.0.min.js',
      'nr-loader-spa-1.317.0.js'
    ])
    expect(expandLoaderFileNames(result.loaderFileNames, result.loaderVersion)).toEqual([
      'nr-loader-rum-1.317.0.min.js',
      'nr-loader-rum-1.317.x.min.js',
      'nr-loader-rum-1.x.x.min.js',
      'nr-loader-rum-1.317.0.js',
      'nr-loader-rum-1.317.x.js',
      'nr-loader-rum-1.x.x.js',
      'nr-loader-full-1.317.0.min.js',
      'nr-loader-full-1.317.x.min.js',
      'nr-loader-full-1.x.x.min.js',
      'nr-loader-full-1.317.0.js',
      'nr-loader-full-1.317.x.js',
      'nr-loader-full-1.x.x.js',
      'nr-loader-spa-1.317.0.min.js',
      'nr-loader-spa-1.317.x.min.js',
      'nr-loader-spa-1.x.x.min.js',
      'nr-loader-spa-1.317.0.js',
      'nr-loader-spa-1.317.x.js',
      'nr-loader-spa-1.x.x.js'
    ])
  })
})
