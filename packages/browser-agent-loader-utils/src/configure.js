import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { setAPI } from '@newrelic/browser-agent-loader-utils/src/api'
import { activateFeatures, activatedFeatures } from '@newrelic/browser-agent-core/src/common/util/feature-flags'
import { isBrowserWindow } from '@newrelic/browser-agent-core/src/common/window/win'

export function configure(agentIdentifier, { init, info, loader_config, exposed = true }) {
    const nr = gosCDN()
    let api = {}
    if (!info) {
        init = nr.init
        info = nr.info
        loader_config = nr.loader_config
        api = nr
    }

    setInfo(agentIdentifier, info)
    setConfiguration(agentIdentifier, init || {})
    setLoaderConfig(agentIdentifier, loader_config || {})
    setRuntime(agentIdentifier, {})

    setAPI(agentIdentifier, api)
    gosNREUMInitializedAgents(agentIdentifier, nr, 'api')
    gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
    if (isBrowserWindow) {
        addToNREUM('activatedFeatures', activatedFeatures)
        addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))
    }

    return api
}
