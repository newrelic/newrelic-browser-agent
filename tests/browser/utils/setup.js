const { ee } = require('../../../src/common/event-emitter/contextual-ee')
const { gosNREUM, setNREUMInitializedAgent } = require('../../../src/common/window/nreum')
const { Aggregator } = require('../../../src/common/aggregate/aggregator')
const { configure } = require('../../../src/loaders/configure/configure')
const { TimeKeeper } = require('../../../src/common/timing/time-keeper')

export function setup (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const timeKeeper = new TimeKeeper(Date.now())
  Object.defineProperty(timeKeeper, 'correctedPageOriginTime', {
    get: function () {
      return performance.now()
    }
  })
  const fakeAgent = { agentIdentifier, timeKeeper }
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  const api = configure(fakeAgent, {}, 'browser-test', true)
  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  aggregator.timeKeeper = timeKeeper
  const baseEE = ee.get(agentIdentifier)

  return { agentIdentifier, baseEE, aggregator, nr, api }
}
