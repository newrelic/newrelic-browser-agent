
const { setInfo, setLoaderConfig, setConfiguration, setRuntime } =  require('@newrelic/browser-agent-core/src/common/config/config')
const { gosCDN, addToNREUM } = require('@newrelic/browser-agent-core/src/common/window/nreum')
const { ee } = require('@newrelic/browser-agent-core/src/common/event-emitter/contextual-ee')
const {Aggregator} = require('@newrelic/browser-agent-core/src/common/aggregate/aggregator')
const {activateFeatures} = require('@newrelic/browser-agent-core/src/common/util/feature-flags')
const { setAPI } = require('@newrelic/browser-agent-core/src/loader/api')

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
