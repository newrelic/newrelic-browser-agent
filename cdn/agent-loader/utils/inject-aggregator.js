
import {gosNREUM, defaults as defInfo} from '../../../modules/common/window/nreum'
import { ee } from '../../../modules/common/event-emitter/contextual-ee'
import { setInfo, setConfiguration, setLoaderConfig, getConfigurationValue } from '../../../modules/common/config/config'
import { mapOwn } from '../../../modules/common/util/map-own'

var getScheme = () => (!getConfigurationValue('ssl')) ? 'http' : 'https'

let loadFired = 0
export function injectAggregator () {
  const nr = gosNREUM() // returns window.NREUM
  if (loadFired++) return
  var info = nr.info

  var firstScript = window.document.getElementsByTagName('script')[0]
  // setTimeout(ee.abort, 30000)

  if (!(info && info.licenseKey && info.applicationID && firstScript)) {
    return ee.abort()
  }

  mapOwn(defInfo, function (key, val) {
    // this will overwrite any falsy value in config
    // This is intentional because agents may write an empty string to
    // the agent key in the config, in which case we want to use the default
    if (!info[key]) info[key] = val
  })
  
  // set configuration from global NREUM.init (When building CDN specifically)
  setInfo(info)
  setConfiguration(nr.init)
  setLoaderConfig(nr.loaderConfig)

  var agent = window.document.createElement('script')

  if (info.agent.indexOf('http://') === 0 || info.agent.indexOf('https://') === 0) {
    agent.src = info.agent
  } else {
    agent.src = getScheme() + '://' + info.agent
  }

  firstScript.parentNode.insertBefore(agent, firstScript)
}