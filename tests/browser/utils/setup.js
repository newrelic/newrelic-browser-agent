const { ee } = require('../../../src/common/event-emitter/contextual-ee')
const { gosNREUM } = require('../../../src/common/window/nreum')
const { Aggregator } = require('../../../src/common/aggregate/aggregator')
const { ObservationContext } = require('../../../src/common/context/observation-context')
const { configure } = require('../../../src/loaders/configure/configure')
export function setup (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const observationContext = new ObservationContext()
  const api = configure(agentIdentifier, {}, 'browser-test', observationContext, true)
  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  const baseEE = ee.get(agentIdentifier)

  return { agentIdentifier, baseEE, aggregator, nr, api }
}
