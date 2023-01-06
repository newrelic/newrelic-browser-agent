const { gosCDN } = require('../../../src/common/window/nreum')
const { ee } = require('../../../src/common/event-emitter/contextual-ee')
const {Aggregator} = require('../../../src/common/aggregate/aggregator')
const { configure } = require('../../../src/loaders/configure/configure')

export function setup(agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
    const nr = configure(agentIdentifier)
    const aggregator = new Aggregator({agentIdentifier})
    const baseEE = ee.get(agentIdentifier)

    return {agentIdentifier, baseEE, aggregator, nr}
}
