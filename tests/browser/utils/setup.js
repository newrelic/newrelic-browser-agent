const { ee } = require('../../../src/common/event-emitter/contextual-ee')
const { gosNREUM, gosNREUMInitializedAgents } = require('../../../src/common/window/nreum')
const { Aggregator } = require('../../../src/common/aggregate/aggregator')
const { configure } = require('../../../src/loaders/configure/configure')
export function setup (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const fakeAgent = { agentIdentifier }
  gosNREUMInitializedAgents(agentIdentifier, fakeAgent)
  const api = configure(fakeAgent, {}, 'browser-test', true)
  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  const baseEE = ee.get(agentIdentifier)

  return { agentIdentifier, baseEE, aggregator, nr, api }
}
