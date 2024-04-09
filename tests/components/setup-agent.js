import { gosNREUM, setNREUMInitializedAgent } from '../../src/common/window/nreum'
import { configure } from '../../src/loaders/configure/configure'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../src/common/aggregate/aggregator'

export function setupAgent (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const fakeAgent = { agentIdentifier }
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  configure(fakeAgent, {}, 'browser-test', true)

  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  const baseEE = ee.get(agentIdentifier)

  return { agentIdentifier, baseEE, aggregator, nr }
}
