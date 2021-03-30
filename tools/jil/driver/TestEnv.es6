
// represents a definition of a browser with Selenium server connection info
export default class TestEnv {
  constructor (connectionInfo, browserSpec) {
    this.connectionInfo = connectionInfo
    this.browserSpec = browserSpec
  }

  toString() {
    return this.browserSpec.toString()
  }
}
