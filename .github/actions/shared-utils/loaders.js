export const loaderTypes = ['rum', 'full', 'spa']

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

export function resolveLoaderFileNames ({ loaderVersion }) {
  if (!loaderVersion) {
    throw new Error('A loader version is required.')
  }

  return {
    loaderFileNames: constructLoaderFileNames(loaderVersion),
    loaderVersion
  }
}

export function expandLoaderFileNames (loaderFileNames, loaderVersion) {
  if (!loaderVersion) {
    return loaderFileNames
  }

  const fuzzyVersions = constructFuzzyVersions(loaderVersion)

  return loaderFileNames.flatMap(loaderFileName => [
    loaderFileName,
    loaderFileName.replace(loaderVersion, fuzzyVersions.PATCH),
    loaderFileName.replace(loaderVersion, fuzzyVersions.MINOR)
  ])
}
