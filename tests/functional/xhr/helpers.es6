import Matcher from '../../../tools/jil/util/browser-matcher.es6'

const sendBeaconBrowsers = Matcher.withFeature('workingSendBeacon')

export function getXhrFromResponse(response, browser) {
  if (sendBeaconBrowsers.match(browser)) {
    return JSON.parse(response.body).xhr
  } else {
    return JSON.parse(response.query.xhr)
  }
}
