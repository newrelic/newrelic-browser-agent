import { parseSpecString } from '../browser-matcher/spec-parser.mjs'
import SpecMatcher from '../browser-matcher/spec-matcher.mjs'

export default function browsersList (browsersList, spec = 'chrome@latest') {
  return spec.split(',')
    .flatMap(specString => {
      let { browserName, specOperator, browserVersion } = parseSpecString(specString, null)

      if (browserName === '*') {
        return Object.values(browsersList)
          .reduce((aggregator, browserEntries) => {
            aggregator.push(...browserEntries)
            return aggregator
          }, [])
      }

      if (browserVersion === 'latest') {
        const specs = Array.from(browsersList[browserName] || [])
          .sort((a, b) => Number(b.version) - Number(a.version))
        return [specs[0]]
      }

      if (!specOperator) {
        return Array.from(browsersList[browserName] || [])
      }

      if (!browserVersion) {
        browserVersion = 999999
      }

      const matcher = new SpecMatcher()
        .include(`${browserName}${specOperator}${browserVersion}`)

      return Array.from(browsersList[browserName] || [])
        .filter(sauceBrowser => matcher.test(browserName, sauceBrowser.version))
    })
    .filter((browserCapability, index, capabilitiesArray) =>
      capabilitiesArray.findIndex(
        cap => cap.browserName === browserCapability.browserName &&
        (
          (cap.browserVersion && browserCapability.browserVersion && cap.browserVersion === browserCapability.browserVersion) ||
          (cap.version && browserCapability.version && cap.version === browserCapability.version)
        )
      ) === index
    )
    .sort((a, b) => {
      if (a.browserName === b.browserName) {
        return Number(a.browserVersion || a.version) - Number(b.browserVersion || b.version)
      }

      return a.browserName.localeCompare(b.browserName)
    })
}
