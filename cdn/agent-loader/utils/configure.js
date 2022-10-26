// cdn specific utility files
import { setAPI } from './api'
import agentIdentifier from '../../shared/agentIdentifier'
// common modules
import { gosCDN } from '@newrelic/browser-agent-core/common/window/nreum'
import { setConfiguration, setInfo, setLoaderConfig, setRuntime } from '@newrelic/browser-agent-core/common/config/config'
import { isWebWorker } from '@newrelic/browser-agent-core/common/window/win'

let configured = false

export function configure() {
    return new Promise((resolve, reject) => {
        if (configured) {
            resolve(configured)
            return
        }
        const nr = gosCDN()
        
        try {
        if (isWebWorker) {  // add a default attr to all worker payloads
            nr.info.jsAttributes = {...nr.info.jsAttributes, isWorker: true};
        }

        setInfo(agentIdentifier, nr.info)
        setConfiguration(agentIdentifier, nr.init)
        setLoaderConfig(agentIdentifier, nr.loader_config)
        setRuntime(agentIdentifier, {})
    
        // add api calls to the NREUM object
        setAPI(agentIdentifier)
        configured = true
        resolve(configured)
        } catch(err){
            reject(err)
        }
    })
}

