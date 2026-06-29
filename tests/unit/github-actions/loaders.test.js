const {
  constructLoaderFileNames,
  constructFuzzyVersions,
  expandLoaderFileNames
} = require('../../../.github/actions/shared-utils/loaders.js')

describe('github actions loader filename resolution', () => {
  test('constructs versioned loader filenames and fuzzy aliases', () => {
    expect(constructLoaderFileNames('1.317.0')).toEqual([
      'nr-loader-rum-1.317.0.min.js',
      'nr-loader-rum-1.317.0.js',
      'nr-loader-full-1.317.0.min.js',
      'nr-loader-full-1.317.0.js',
      'nr-loader-spa-1.317.0.min.js',
      'nr-loader-spa-1.317.0.js'
    ])
    expect(constructFuzzyVersions('1.317.0')).toEqual({
      MINOR: '1.x.x',
      PATCH: '1.317.x'
    })
    expect(expandLoaderFileNames(constructLoaderFileNames('1.317.0'), '1.317.0')).toEqual([
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
