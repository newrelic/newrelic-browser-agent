const { mkdtemp, rm, writeFile } = require('fs/promises')
const { tmpdir } = require('os')
const { join } = require('path')

const {
  constructLoaderFileNames,
  expandLoaderFileNames,
  resolveLoaderFileNames
} = require('../../../.github/actions/shared-utils/loaders.js')

describe('github actions loader filename resolution', () => {
  let tempDir

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  test('uses versionless loader filenames when the build has no numbered version', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'nrba-loaders-'))

    await writeFile(join(tempDir, 'nr-loader-rum.min.js'), '')
    await writeFile(join(tempDir, 'nr-loader-rum.js'), '')
    await writeFile(join(tempDir, 'nr-loader-full.min.js'), '')
    await writeFile(join(tempDir, 'nr-loader-full.js'), '')
    await writeFile(join(tempDir, 'nr-loader-spa.min.js'), '')
    await writeFile(join(tempDir, 'nr-loader-spa.js'), '')

    const result = await resolveLoaderFileNames({ localDir: tempDir })

    expect(result.loaderVersion).toBeNull()
    expect(result.hasFuzzyVersions).toBe(false)
    expect(result.loaderFileNames).toEqual([
      'nr-loader-rum.min.js',
      'nr-loader-rum.js',
      'nr-loader-full.min.js',
      'nr-loader-full.js',
      'nr-loader-spa.min.js',
      'nr-loader-spa.js'
    ])
    expect(expandLoaderFileNames(result.loaderFileNames, result.loaderVersion, result.hasFuzzyVersions)).toEqual(result.loaderFileNames)
    expect(constructLoaderFileNames('1.317.0')).toEqual([
      'nr-loader-rum-1.317.0.min.js',
      'nr-loader-rum-1.317.0.js',
      'nr-loader-full-1.317.0.min.js',
      'nr-loader-full-1.317.0.js',
      'nr-loader-spa-1.317.0.min.js',
      'nr-loader-spa-1.317.0.js'
    ])
  })

  test('uses numbered loader filenames when a loader version is provided directly', async () => {
    const result = await resolveLoaderFileNames({ loaderVersion: '1.317.0' })

    expect(result.loaderVersion).toBe('1.317.0')
    expect(result.hasFuzzyVersions).toBe(true)
    expect(result.loaderFileNames).toEqual([
      'nr-loader-rum-1.317.0.min.js',
      'nr-loader-rum-1.317.0.js',
      'nr-loader-full-1.317.0.min.js',
      'nr-loader-full-1.317.0.js',
      'nr-loader-spa-1.317.0.min.js',
      'nr-loader-spa-1.317.0.js'
    ])
    expect(expandLoaderFileNames(result.loaderFileNames, result.loaderVersion, result.hasFuzzyVersions)).toEqual([
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
