/**
 * Generated from the supportability metric registry (tools/supportability-metrics/registry.js): one test per metric, each proving the
 * metric is actually reported. A metric with no trigger, and not listed in pending.js, fails. Metrics in pending.js are reported as
 * todo (or expected failures) and print a warning, but never block.
 *
 * To cover a metric, add a trigger for its registry entry in ./triggers/*.js and remove it from ./pending.js.
 */
import { setupAgent } from '../setup-agent'
import { observe, listTargets } from './harness'
import { drain } from '../../../src/common/drain/drain'

const triggers = require('./triggers')
const pending = require('./pending')

// Mock script-tracker to avoid PerformanceObserver requirement
jest.mock('../../../src/common/v2/script-tracker', () => ({
  findScriptTimings: jest.fn(() => ({ registeredAt: performance.now(), reportedAt: undefined, fetchStart: 0, fetchEnd: 0, scriptStart: 0, scriptEnd: 0, asset: undefined, type: 'unknown' }))
}))

jest.retryTimes(0)

let agent
const instruments = new Map()

/** Shared helpers handed to every trigger. */
const ctx = {
  get agent () { return agent },
  /**
   * Initializes a feature once per test file and returns its aggregate. Features can only be instrumented once per agent.
   * @param {Function} Instrument The feature's Instrument class.
   * @returns {Promise<Object>} The feature's aggregate instance.
   */
  /** Waits for work the agent defers with a timer, such as a drained feature processing its buffered events. */
  settle: () => new Promise(resolve => setTimeout(resolve, 25)),
  /**
   * Drains a feature's buffered events now. A normal drain waits until every registered feature is staged, which the real agent reaches
   * after the RUM response but a test sharing one agent across many features never does.
   * @param {Object} aggregate The feature's aggregate instance.
   */
  forceDrain: (aggregate) => drain(agent, aggregate.featureName, true),
  async feature (Instrument) {
    if (!instruments.has(Instrument)) {
      const instrument = new Instrument(agent)
      await new Promise(process.nextTick)
      instruments.set(Instrument, instrument)
    }
    return instruments.get(Instrument).featAggregate
  }
}

const targets = listTargets(triggers)

beforeAll(() => {
  agent = setupAgent()
  if (pending.length) console.warn(`Supportability metrics without a generated test: ${pending.length} of ${targets.length}. See tests/components/supportability-metrics/pending.js`)
})

afterEach(() => {
  jest.restoreAllMocks()
})

targets.forEach(({ tag, entryTag, value }) => {
  const trigger = triggers[entryTag]
  const run = typeof trigger === 'function' ? trigger : trigger?.run
  const isPending = pending.includes(tag)

  const scenario = async () => {
    const seen = await observe(() => run(value, ctx))
    expect([...seen]).toEqual(expect.arrayContaining([tag]))
  }

  if (!run) {
    if (isPending) test.todo(tag)
    else test(tag, () => { throw new Error(`No trigger for "${entryTag}". Add one in tests/components/supportability-metrics/triggers, or list "${tag}" in pending.js.`) })
  } else if (isPending) {
    // expected to fail until it is fixed: this test fails if the scenario starts passing, which means the pending entry is stale
    test.failing(`${tag} (pending: remove it from pending.js once this passes)`, scenario)
  } else {
    test(tag, scenario)
  }
})
