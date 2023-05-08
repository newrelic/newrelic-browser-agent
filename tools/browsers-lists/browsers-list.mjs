import { parseSpecString } from '../browser-matcher/spec-parser.mjs'
import SpecMatcher from '../browser-matcher/spec-matcher.mjs'
import browsersSupported from './browsers-supported.json' assert { type: "json" }

export default function browsersList (browsersList, spec = 'chrome@latest') {
  return spec.split(',')
    .flatMap(specString => {
      let { browserName, specOperator, browserVersion } = parseSpecString(specString, null)

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
        .filter(sauceBrowser => matcher.test(`${browserName}@${sauceBrowser.version}`))
    })
}
