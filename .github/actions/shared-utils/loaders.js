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

function constructLoaderFileNameVariants (loaderFileName, loaderVersion) {
  const fuzzyVersions = constructFuzzyVersions(loaderVersion)

  let exactLoaderFileName = loaderFileName

  if (!loaderFileName.includes(loaderVersion)) {
    const versionlessMatch = loaderFileName.match(versionlessLoaderFilePattern)

    if (!versionlessMatch) {
      throw new Error(`Unexpected loader filename ${loaderFileName}.`)
    }

    const [, type] = versionlessMatch
    exactLoaderFileName = loaderFileName.replace(
      versionlessLoaderFilePattern,
      `nr-loader-${type}-${loaderVersion}${loaderFileName.includes('.min') ? '.min' : ''}.js`
    )
  }

  return {
    exact: exactLoaderFileName,
    patch: exactLoaderFileName.replace(loaderVersion, fuzzyVersions.PATCH),
    minor: exactLoaderFileName.replace(loaderVersion, fuzzyVersions.MINOR)
  }
}

export async function resolveLoaderFileNames ({ localDir, loaderVersion, fuzzyOnly = false }) {
  if (localDir) {
    const localFiles = await readdir(localDir)
    const expectedLoaderFileNames = constructLoaderFileNames()
    const missingLoaderFileNames = expectedLoaderFileNames.filter(file => !localFiles.includes(file))

    if (missingLoaderFileNames.length) {
      throw new Error(`Unable to determine versionless loader filenames from ${localDir}. Missing: ${missingLoaderFileNames.join(', ')}`)
    }

    if (fuzzyOnly && !loaderVersion) {
      throw new Error('A loader version is required when using local directory fuzzy-only mode.')
    }

    return {
      loaderFileNames: expectedLoaderFileNames,
      loaderVersion: fuzzyOnly ? loaderVersion : null,
      hasFuzzyVersions: fuzzyOnly
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

export function expandLoaderFileNames (loaderFileNames, loaderVersion, hasFuzzyVersions = true, fuzzyOnly = false) {
  if (!loaderVersion || !hasFuzzyVersions) {
    return loaderFileNames
  }

  return loaderFileNames.flatMap(loaderFileName => {
    const variants = constructLoaderFileNameVariants(loaderFileName, loaderVersion)

    return fuzzyOnly ? [variants.patch, variants.minor] : [variants.exact, variants.patch, variants.minor]
  })
}
