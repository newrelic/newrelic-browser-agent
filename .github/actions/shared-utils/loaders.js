export const loaderTypes = ['rum', 'full', 'spa']

export function constructLoaderFileNames (loaderVersion) {
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
