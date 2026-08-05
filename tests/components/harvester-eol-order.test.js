import { setupAgent, resetAgent } from './setup-agent'
import { InstrumentBase } from '../../src/features/utils/instrument-base'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { subscribeToVisibilityChange } from '../../src/common/window/page-visibility'

/**
 * Regression coverage for the INP-loss bug: Harvester's EOL harvest is triggered from a 'visibilitychange' listener,
 * which races against any OTHER 'visibilitychange' listener registered by a feature's own aggregate (e.g. web-vitals'
 * onINP, which -- unlike onCLS/onLCP -- only ever reports its value from within its own 'visibilitychange' listener,
 * since our subscription doesn't set `reportAllChanges`). If Harvester's listener happened to run first and snapshot
 * the buffer before that other listener added its data, the data is lost for good -- there's no second chance on a
 * hard navigation.
 *
 * Harvester#startTimer fixes this by deferring the actual harvest work in its EOL callback to a microtask (see
 * queueMicrotask there). Since 'visibilitychange' dispatch is fully synchronous -- every listener on `document` runs
 * to completion in one call stack -- deferring only the harvest means it always runs after that whole synchronous
 * dispatch settles, regardless of which listener happened to register first. This test proves that using a real
 * (non-fake) 'visibilitychange' event, with a fast-resolving feature and a slow-resolving one (like page_view_timing's
 * real aggregate chunk vs. a trivial one) so the registration order actually varies and isn't something the test
 * controls -- the microtask deferral should keep the order correct regardless.
 *
 * This alone was confirmed (via real-browser testing, not this suite) to be enough to fix INP, but NOT enough to fix
 * CLS -- page_view_timing's own CLS-flush listener additionally needed `capture: true` (see the comment at its
 * `subscribeToVisibilityChange` call site) before its data reliably landed in the same final harvest as the rest.
 * jsdom's simplified event dispatch does not reproduce whatever real-Chrome behavior made that flag necessary --
 * both cases pass below regardless of capture -- so this suite validates the microtask deferral's logical guarantee
 * (order-independence within a single dispatch), while the capture-phase requirement remains a real-browser-only
 * finding that this automated suite can't independently verify.
 */

describe('Harvester EOL listener ordering', () => {
  let agent
  let addedListeners

  beforeEach(() => {
    // Neither the dummy aggregate's nor Harvester's own 'visibilitychange' listener can be unsubscribed through the
    // public API, but jsdom's `document` persists across tests in this file -- without removing them, a prior test's
    // listener leaks into the next dispatch. Capture every listener added during the test so it can be torn down.
    addedListeners = []
    jest.spyOn(document, 'addEventListener').mockImplementation((...args) => {
      addedListeners.push(args)
      return Document.prototype.addEventListener.apply(document, args)
    })
  })

  afterEach(() => {
    addedListeners.forEach(args => Document.prototype.removeEventListener.apply(document, args))
    jest.restoreAllMocks()
    if (agent) resetAgent(agent)
    agent = undefined
  })

  test.each([
    ['bubble phase (default)', false],
    ['capture phase (matches page_view_timing\'s CLS listener)', true]
  ])('fires after a %s visibilitychange listener registered by a slower-loading feature aggregate', async (_, capture) => {
    const order = []

    class FastAggregate {
      constructor () {
        this.harvestOpts = {} // Harvester's EOL callback reads this before triggering a harvest
      }
    }

    class SlowAggregate {
      constructor () {
        this.harvestOpts = {}
        // Mimics a feature aggregate that, like page_view_timing's web-vitals wiring, subscribes its own
        // 'visibilitychange' listener as part of construction.
        subscribeToVisibilityChange(() => order.push('aggregate'), false, capture)
      }
    }

    agent = setupAgent({
      init: {
        [FEATURE_NAMES.ajax]: { autoStart: true },
        [FEATURE_NAMES.pageViewTiming]: { autoStart: true }
      }
    })

    const fastInstrument = new InstrumentBase(agent, FEATURE_NAMES.ajax)
    const slowInstrument = new InstrumentBase(agent, FEATURE_NAMES.pageViewTiming)
    agent.features[FEATURE_NAMES.ajax] = fastInstrument
    agent.features[FEATURE_NAMES.pageViewTiming] = slowInstrument

    // The fast feature's aggregate module resolves immediately; the slow one resolves only after a real async delay,
    // mimicking a slower-loading chunk (e.g. page_view_timing's, which pulls in the web-vitals library).
    fastInstrument.importAggregator(agent, () => Promise.resolve({ Aggregate: FastAggregate }))
    slowInstrument.importAggregator(agent, () => new Promise(resolve => {
      setTimeout(() => resolve({ Aggregate: SlowAggregate }), 20)
    }))

    // Let both features -- and the fire-and-forget `Promise.all(...).then(startTimer)` in ensureRuntimeBootstrap that
    // depends on both -- fully settle before dispatching.
    await Promise.all([fastInstrument.onAggregateImported, slowInstrument.onAggregateImported])
    await new Promise(process.nextTick)
    await new Promise(process.nextTick)

    jest.spyOn(agent.runtime.harvester, 'triggerHarvestFor').mockImplementation(() => order.push('harvester'))

    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await null // Harvester's actual harvest work is deferred to a microtask -- see Harvester#startTimer

    // triggerHarvestFor runs once per initialized aggregate (fast + slow); the key assertion is that 'aggregate' --
    // the slow feature's own listener -- always precedes both.
    expect(order).toEqual(['aggregate', 'harvester', 'harvester'])
  })
})
