import { getRuntime, setInfo, getInfo, getConfigurationValue } from '@newrelic/browser-agent-core/common/config/config'
import { importFeatures } from './util/features'
import { activateFeatures, activatedFeatures, drainAll } from '@newrelic/browser-agent-core/common/util/feature-flags'
import { isBrowserWindow } from '@newrelic/browser-agent-core/common/window/win'
import { addToNREUM, gosCDN } from '@newrelic/browser-agent-core/common/window/nreum'
import agentIdentifier from '../shared/agentIdentifier'
import { initializeAPI } from './util/api'

const requiredKeys = ['applicationID', 'errorBeacon', 'beacon', 'licenseKey']

export function aggregator(build) {
  const loaderInfo = getInfo(agentIdentifier)
  if (!requiredKeys.every(key => !!loaderInfo[key])) {
    // do this again in case they are using a custom build that has 
    // nr.info below the main agent script in some way
    const nr = gosCDN()
    setInfo(agentIdentifier, nr.info)
  }

  const autorun = typeof (getRuntime(agentIdentifier).autorun) !== 'undefined' ? getRuntime(agentIdentifier).autorun : true

  initializeAPI(agentIdentifier)

  // Features are activated using the legacy setToken function name via JSONP
  if (isBrowserWindow) addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

  // import relevant feature aggregators
  if (autorun) return initializeFeatures();

  async function initializeFeatures() {
    const features = await importFeatures(build)
    // gosNREUMInitializedAgents(agentIdentifier, features, 'features')
    // once ALL the enabled features all initialized,
    // add the activated features from the setToken call to the window for testing purposes
    // and activatedFeatures will drain all the buffers
    addToNREUM('activatedFeatures', activatedFeatures)
    if (!isBrowserWindow) drainAll(agentIdentifier)
  }
}

