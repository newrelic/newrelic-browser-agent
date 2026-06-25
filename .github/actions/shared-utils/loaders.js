import { readdir } from 'fs/promises'

export const loaderTypes = ['rum', 'full', 'spa']

const versionlessLoaderFilePattern = /^nr-loader-(rum|full|spa)(?:\.min)?\.js$/

export function constructLoaderFileNames (loaderVersion) {
  if (!loaderVersion) {
    return loaderTypes.map(type => [
      `nr-loader-${type}.min.js`,
      `nr-loader-${type}.js`,
    ]).flat()
  }

  return loaderTypes.map(type => [
    `nr-loader-${type}-${loaderVersion}.min.js`,
    `nr-loader-${type}-${loaderVersion}.js`,
  ]).flat()
}

export function constructFuzzyVersions (loaderVersion) {
  const pieces = loaderVersion.split('.')
  return {
    // MAJOR: 'x.x.x', -- synonymous with "-current.js/min.js" file
    MINOR: `${pieces[0]}.x.x`,
    PATCH: `${pieces[0]}.${pieces[1]}.x`
  }
}

export async function resolveLoaderFileNames ({ localDir, loaderVersion }) {
  if (localDir) {
    const localFiles = await readdir(localDir)
    const expectedLoaderFileNames = constructLoaderFileNames()
    const missingLoaderFileNames = expectedLoaderFileNames.filter(file => !localFiles.includes(file))

    if (missingLoaderFileNames.length) {
      throw new Error(`Unable to determine versionless loader filenames from ${localDir}. Missing: ${missingLoaderFileNames.join(', ')}`)
    }

    return {
      loaderFileNames: expectedLoaderFileNames,
      loaderVersion: null,
      hasFuzzyVersions: false
    }
  }

  if (!loaderVersion) {
    throw new Error('A loader version or local directory is required.')
  }

  return {
    loaderFileNames: constructLoaderFileNames(loaderVersion),
    loaderVersion,
    hasFuzzyVersions: true
  }
}

export function expandLoaderFileNames (loaderFileNames, loaderVersion, hasFuzzyVersions = true) {
  if (!loaderVersion || !hasFuzzyVersions) {
    return loaderFileNames
  }

  const fuzzyVersions = constructFuzzyVersions(loaderVersion)

  return loaderFileNames.map(loaderFileName => [
    loaderFileName,
    loaderFileName.replace(loaderVersion, fuzzyVersions.PATCH),
    loaderFileName.replace(loaderVersion, fuzzyVersions.MINOR)
  ]).flat()
}
