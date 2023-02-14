import browserList from '../util/browser-list.mjs'
import jilArgs from '../args.mjs'

function seleniumCapabilities () {
  // We only add one entry per browser so we don't have to mess with versions
  const browsersAdded = new Set()

  return browserList(jilArgs.browsers)
    .filter((browserSpec) => {
      if (!browsersAdded.has(browserSpec.desired.browserName)) {
        browsersAdded.add(browserSpec.desired.browserName)
        return true
      }
      return false
    })
    .map((browserSpec) => ({
      browserName: browserSpec.desired.browserName
    }))
}

export default function config () {
  if (!jilArgs.selenium) {
    return {}
  } else {
    return {
      hostname: jilArgs.seleniumHost,
      port: jilArgs.seleniumPort,
      capabilities: seleniumCapabilities()
    }
  }
}
