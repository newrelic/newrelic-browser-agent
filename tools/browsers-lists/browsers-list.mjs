import { getBrowserName, getBrowserVersion } from './utils.mjs'
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
        .filter(sauceBrowser => matcher.test(getBrowserName(sauceBrowser), getBrowserVersion(sauceBrowser)))
    })
    .sort((a, b) => {
      if (getBrowserName(a) === getBrowserName(b)) {
        return Number(getBrowserVersion(a)) - Number(getBrowserVersion(b))
      }

      return getBrowserName(a).localeCompare(getBrowserName(b))
    })
}
