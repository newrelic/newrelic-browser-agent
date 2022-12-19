import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../config/config'
import { setAPI } from '../api/api'
import { activateFeatures } from '../util/feature-flags'
import { isBrowserWindow } from '../window/win'

export function configure(agentIdentifier, { init={}, info={}, loader_config={}, exposed = true, topLevelConfigs = false }) {
    const nr = gosCDN()
    let api = {}
    if (topLevelConfigs) {
        init = nr.init
        info = nr.info
        loader_config = nr.loader_config
        api = nr
    }

    setInfo(agentIdentifier, info)
    setConfiguration(agentIdentifier, init)
    setLoaderConfig(agentIdentifier, loader_config)
    setRuntime(agentIdentifier, {})

    setAPI(agentIdentifier, api)
    gosNREUMInitializedAgents(agentIdentifier, nr, 'api')
    gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
    if (isBrowserWindow) addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

    return api
}
