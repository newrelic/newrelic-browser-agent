
const { setInfo, setLoaderConfig, setConfiguration, setRuntime } =  require('../../../packages/browser-agent-core/common/config/config')
const { gosCDN, addToNREUM } = require('../../../packages/browser-agent-core/common/window/nreum')
const { ee } = require('../../../packages/browser-agent-core/common/event-emitter/contextual-ee')
const {Aggregator} = require('../../../packages/browser-agent-core/common/aggregate/aggregator')
const {activateFeatures} = require('../../../packages/browser-agent-core/common/util/feature-flags')
const { setAPI } = require('../../../cdn/agent-loader/utils/api')

export function setup(agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
    const nr = gosCDN()

    setInfo(agentIdentifier, nr.info)
    setConfiguration(agentIdentifier, nr.init)
    setLoaderConfig(agentIdentifier, nr.loader_config)
    setRuntime(agentIdentifier, {})

    const aggregator = new Aggregator({agentIdentifier})
    const baseEE = ee.get(agentIdentifier)

    setAPI(agentIdentifier)

    // Features are activated using the legacy setToken function name via JSONP
    addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))

    return {agentIdentifier, baseEE, aggregator, nr}
}