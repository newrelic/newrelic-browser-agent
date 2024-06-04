import { parseSpecString, equationIsTrue } from '../browser-matcher/spec-parser.mjs'

export default function browsersList (deskSpecsMap, mobileSpecsMap, spec = 'chrome@latest') {
  return spec.split(',') // other example spec str: '*', '*@*', 'safari@*', '*@latest-5', 'firefox@100,edge>=100'
    .flatMap(specString => {
      let { browserName, specOperator, browserVersion } = parseSpecString(specString)

      if (browserName === '*') {
        if (!specOperator || !browserVersion || browserVersion === '*') {
          return Object.values(deskSpecsMap).flat().concat(Object.values(mobileSpecsMap).flat()) // we'll allow '*@' to also mean '*@*'
        }
        if (!browserVersion.startsWith('latest') || specOperator !== '@') return [] // '*>=125' unsupported since not all browser follow the same numeric versioning

        const latestXSpecs = Object.entries(deskSpecsMap).reduce((finalList, [browserName, versionSpecs]) => {
          const latestVersionSpec = versionSpecs[0]
          if (browserName !== 'safari') latestVersionSpec.browserVersion = browserVersion // want to get the 'latest-#' of chrome,ff,edge
          // else: Safari doesn't support latest-# slugs, so we'll always get the most recent of it regardless '*@latest' or '*@latest-5'

          finalList.push(latestVersionSpec)
          return finalList
        }, [])

        Object.values(mobileSpecsMap).forEach(versionSpecs => { // Assume: mobile-supported.json lists in descending order
          const desiredVersionIdx = Math.min(versionSpecs.length - 1, Number(browserVersion.split('-')[1]) || 0) // 'latest-50' will pick the lowest version avail
          latestXSpecs.push(versionSpecs[desiredVersionIdx])
        })

        return latestXSpecs
      } else { // specific browser requested
        if (!deskSpecsMap[browserName] && !mobileSpecsMap[browserName]) return [] // invalid browserName
        const versionSpecs = deskSpecsMap[browserName] || mobileSpecsMap[browserName]

        if (!specOperator) return versionSpecs // e.g. 'safari' same as 'safari@*'
        if (!browserVersion) return [] // e.g. 'safari@' is invalid
        if (browserVersion === '*') return versionSpecs

        // For a valid browserName and browserVersion string format (under '@' oper), we'll pass it to LT to handle. This lets 'chrome@100' or 'chrome@latest-20' be accepted.
        if (deskSpecsMap[browserName]) {
          if (specOperator !== '@') return versionSpecs // logic with comparison ops (<=, etc.) on fuzzy versions (latest-#) is more trouble than it's worth ATM, so non-@ operators will be treated like '*'

          const customDeskSpec = { ...versionSpecs[0] }
          customDeskSpec.browserVersion = browserVersion
          // eslint-disable-next-line sonarjs/no-collapsible-if
          if (customDeskSpec.browserName === 'Safari') {
            if (!browserVersion.startsWith('latest')) delete customDeskSpec.platformName // LT will find the most appropriate macOS based on numeric version
            // else, macOS version defaults to the first entry in our json safari list which should be the lastest macOS
          }
          return customDeskSpec
        } else {
          const desiredRuleVersion = Number(browserVersion)
          if (Number.isFinite(desiredRuleVersion)) return versionSpecs.filter(spec => equationIsTrue(Number(spec.version), specOperator, desiredRuleVersion))

          if (specOperator === '@' && browserVersion === 'latest') return versionSpecs[0]
          else return [] // only 'mobile@latest' is supported if version is not numeric; '16.0.3', 'latest-3', and specific version not in json is not supported
        }
      }
    })
}
