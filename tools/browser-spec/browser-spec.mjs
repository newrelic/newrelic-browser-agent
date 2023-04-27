/**
 * Represents a specification for a browser and its platform.
 * @class
 * @param {object} desired - An object specifying the desired browser and platform.
 */
export default class BrowserSpec {
  constructor (desired) {
    this.desired = desired
  }

  allowsExtendedDebugging () {
    return (
      ['chrome', 'firefox'].includes(this.desired.browserName) &&
      this.version === 'latest'
    )
  }

  toString () {
    return `${this.browserName}@${this.version} (${this.platformName})`
  }

  match (specString) {
    let list = browserList(specString)
    return !!Array.from(list).filter((b) => this.same(b)).length
  }

  same (other) {
    return (
      this.platformName === other.platformName &&
      this.browserName === other.browserName &&
      this.browserVersion === other.browserVersion
    )
  }

  hasFeature (feature) {
    let matcher = BrowserMatcher.withFeature(feature)
    return matcher.match(this)
  }

  get isMobile () {
    return !!(this.desired.platformName && this.desired.platformVersion)
  }

  get platformName () {
    if (this.desired.platformName) {
      return this.desired.platformName.toLowerCase()
    }
    if (this.desired.platform) {
      return this.desired.platform.toLowerCase()
    }
    return ''
  }

  get platformVersion () {
    return this.desired.platformVersion
  }

  get browserName () {
    return this.isMobile ? this.platformName : this.desired.browserName
  }

  get version () {
    return this.isMobile ? this.platformVersion : this.desired.version
  }
}
