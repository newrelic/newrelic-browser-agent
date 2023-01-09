import { getRuntime, setInfo, getInfo } from '@newrelic/browser-agent-core/src/common/config/config'
import { importFeatures } from './util/features'
import { activateFeatures, activatedFeatures, drainAll } from '@newrelic/browser-agent-core/src/common/util/feature-flags'
import { isBrowserScope } from '@newrelic/browser-agent-core/src/common/util/global-scope'
import { addToNREUM, gosCDN } from '@newrelic/browser-agent-core/src/common/window/nreum'
import agentIdentifier from '../shared/agentIdentifier'
import { initializeAPI } from './util/api'

const requiredKeys = ['applicationID', 'errorBeacon', 'beacon', 'licenseKey']

export function aggregator(build) {
  const loaderInfo = getInfo(agentIdentifier)
  if (!requiredKeys.every(key => !!loaderInfo[key])) {
    try {
      // do this again in case they are using a custom build that has
      // nr.info below the main agent script in some way
      const nr = gosCDN()
      // the jsAttributes need to be merged and handled gracefully so that this action does not overwrite any existing attributes
      // that may have been added in the time between the loader initialization and this moment
      const windowJsAttributes = nr.info?.jsAttributes || {}
      const loaderJsAttributes = getInfo(agentIdentifier)?.jsAttributes || {}
      setInfo(agentIdentifier, { ...nr.info, jsAttributes: { ...windowJsAttributes, ...loaderJsAttributes } })
    } catch (err) {
      // something failed and the agent will likely not send data correctly come harvest time
      // TODO - handle a failure here more gracefully,
      // and also start checking if the second pass had the required keys...
    }
  }

  const autorun = typeof (getRuntime(agentIdentifier).autorun) !== 'undefined' ? getRuntime(agentIdentifier).autorun : true

  initializeAPI(agentIdentifier)

  // Features are activated using the legacy setToken function name via JSONP
  if (isBrowserScope) addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

  // import relevant feature aggregators
  if (autorun) return initializeFeatures();

  async function initializeFeatures() {
    const features = await importFeatures(build)
    // gosNREUMInitializedAgents(agentIdentifier, features, 'features')
    // once ALL the enabled features all initialized,
    // add the activated features from the setToken call to the window for testing purposes
    // and activatedFeatures will drain all the buffers
    addToNREUM('activatedFeatures', activatedFeatures)
    if (!isBrowserScope) drainAll(agentIdentifier)
  }
}

