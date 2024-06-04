import { parseSpecString } from '../browser-matcher/spec-parser.mjs'

export default function browsersList (browsersList, spec = 'chrome@latest-2') { // latest-2 is the most stable release and what we test by default
  return spec.split(',') // other example spec str: '*', '*@*', 'safari@*', '*@latest-2', 'firefox@100,edge>=100'
    .flatMap(specString => {
      let { browserName, specOperator, browserVersion } = parseSpecString(specString)

      if (browserName === '*') {
        const allSpecs = Object.values(browsersList).flat()
        if (!specOperator || !browserVersion || browserVersion === '*') return allSpecs // we'll allow '*@' to also mean '*@*'
        if (!browserVersion.startsWith('latest')) return [] // '*>=125' unsupported since not all browser follow the same numeric versioning

        const latestSafari = allSpecs.find(spec => spec.browserName === 'Safari')
        const latestXSpecs = allSpecs.filter(spec => spec.browserVersion === 'latest-2').map(spec => {
          spec.browserVersion = browserVersion // get the 'latest-#' of every browser except Safari
          return spec
        })
        latestXSpecs.push(latestSafari) // Safari doesn't support latest-# slugs, so we'll always get the most recent of it regardless '*@latest-2' or '*@latest' or '*@latest-5'

        return latestXSpecs
      } else { // specific browser requested
        if (!browsersList[browserName]) return [] // invalid browserName
        const presetVersionSpecs = Array.from(browsersList[browserName])

        if (!specOperator) return presetVersionSpecs // e.g. 'safari' same as 'safari@*'
        if (!browserVersion) return [] // e.g. 'safari@' is invalid
        if (browserVersion === '*' || specOperator !== '@') {
          // We don't have a way to deal with comparison ops (<=, etc.)--or the need to do so--on fuzzy versions (latest-X, macOS XYZ) in lambdatest-supported.json ATM.
          // Hence, non-@ operators will be treated as grabbing all preset versions, similar to specifying '*'.
          return presetVersionSpecs
        }

        // For a valid browserName and browserVersion string format (under '@' oper), we'll pass it to LT to handle. This lets 'chrome@100' or 'chrome@latest-20' be accepted.
        const ontheflySpec = { ...presetVersionSpecs[0] }
        ontheflySpec.browserVersion = browserVersion
        // eslint-disable-next-line sonarjs/no-collapsible-if
        if (ontheflySpec.browserName === 'Safari') {
          if (!browserVersion.startsWith('latest')) delete ontheflySpec.platformName // LT will find the most appropriate macOS based on numeric version
          // else, macOS version defaults to the first entry in our json safari list which should be the lastest macOS
        }
        return ontheflySpec
      }
    })
}
