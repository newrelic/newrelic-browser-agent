import { setAPI } from '../api/api'
import { addToNREUM, gosCDN, gosNREUMInitializedAgents } from '../../common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '../../common/config/config'
import { activateFeatures, activatedFeatures } from '../../common/util/feature-flags'
import { isBrowserWindow, isWebWorker } from '../../common/window/win'

export function configure(agentIdentifier, opts = {}) {
    let { init, info, loader_config, runtime = {}, exposed = true } = opts
    const nr = gosCDN()
    let api = {}
    if (!info) {
        init = nr.init
        info = nr.info
        loader_config = nr.loader_config
        api = nr
    }

    if (isWebWorker) {  // add a default attr to all worker payloads
        info.jsAttributes = { ...info.jsAttributes, isWorker: true };
    }

    setInfo(agentIdentifier, info)
    setConfiguration(agentIdentifier, init || {})
    setLoaderConfig(agentIdentifier, loader_config || {})
    setRuntime(agentIdentifier, runtime)


    setAPI(agentIdentifier, api)
    gosNREUMInitializedAgents(agentIdentifier, nr, 'api')
    gosNREUMInitializedAgents(agentIdentifier, exposed, 'exposed')
    if (isBrowserWindow) {
        addToNREUM('activatedFeatures', activatedFeatures)
        addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))
    }

    return api
}
