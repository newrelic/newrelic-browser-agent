const { ee } = require('../../../src/common/event-emitter/contextual-ee')
const { gosNREUM, setNREUMInitializedAgent } = require('../../../src/common/window/nreum')
const { Aggregator } = require('../../../src/common/aggregate/aggregator')
const { configure } = require('../../../src/loaders/configure/configure')
const { TimeKeeper } = require('../../../src/common/timing/time-keeper')
const { setRuntime } = require('../../../src/common/config/config')

export function setup (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const fakeAgent = { agentIdentifier, timeKeeper }
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  const api = configure(fakeAgent, {}, 'browser-test', true)
  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  const baseEE = ee.get(agentIdentifier)

  const timeKeeper = new TimeKeeper(agentIdentifier)
  Object.defineProperty(timeKeeper, 'correctedPageOriginTime', {
    get: function () {
      return performance.now()
    }
  })
  setRuntime(agentIdentifier, { timeKeeper })

  return { agentIdentifier, baseEE, aggregator, nr, api }
}
