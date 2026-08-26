import { setupAgent, resetAgent } from './setup-agent'
import { InstrumentBase } from '../../src/features/utils/instrument-base'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { subscribeToVisibilityChange } from '../../src/common/window/page-visibility'
import { Harvester } from '../../src/common/harvest/harvester'

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
 * finding that this automated suite can't independently verify. See tests/specs/pvt/timings.e2e.js's "sends
 * pageHide, CLS & INP together in a single EoL harvest" test for the real-browser coverage of both fixes together.
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

/**
 * Regression coverage for a deadlock risk in ensureRuntimeBootstrap (instrument-base.js): Harvester#startTimer is
 * only called once every AUTO-STARTED feature's onAggregateImported has resolved. A feature configured
 * autoStart: false never resolves onAggregateImported until the `start` API is called (see InstrumentBase's
 * constructor and its `deferred` promise) -- if such a feature is simply never started, a naive
 * `Promise.all(Object.values(agentRef.features).map(f => f.onAggregateImported))` would wait on it forever,
 * which means startTimer() -- and therefore ALL harvesting, for every feature, not just the deferred one --
 * would never run either.
 *
 * The fix filters that Promise.all down to only features present in agentRef.runtime.drainRegistry at the time
 * ensureRuntimeBootstrap reads it. An auto-started feature registers itself there synchronously, in its
 * InstrumentBase constructor, well before this bootstrap (deferred to window load) ever runs; a never-started
 * autoStart: false feature does not register until `start` is actually called. So the registry already reflects
 * exactly the auto-started set by the time it's read, and a feature that never starts is excluded rather than
 * blocking the rest of the agent.
 *
 * (An earlier attempt fixed the deadlock by starting the timer unconditionally/immediately instead of gating on
 * any features at all -- that was reverted because it broke real INP capture in
 * tests/specs/pvt/timings.e2e.js's "FI, INP & LCP" test.)
 */
describe('Harvester#startTimer is not blocked by a never-started autoStart:false feature', () => {
  let agent

  afterEach(() => {
    if (agent) resetAgent(agent)
    agent = undefined
  })

  test('starts the timer once auto-started features finish loading, without waiting on a feature that never calls start()', async () => {
    class TrivialAggregate {
      constructor () {
        this.harvestOpts = {}
      }
    }

    // Deliberately NOT reusing FEATURE_NAMES.ajax/pageViewTiming (as the 'Harvester EOL listener ordering' describe
    // above does): agentRef.runtime.drainRegistry is the SAME shared Map instance across every agent created in
    // this file (mergeRuntime/RuntimeModel copies its default Map by reference, not a per-agent clone -- see
    // src/common/config/runtime.js), and registerDrain's guard means an entry, once added, is never overwritten.
    // The dummy aggregates above never call their own drain(), so 'ajax'/'page_view_timing' stay registered
    // forever, which would make THIS test's own drainRegistry.has() check for either name a false positive
    // regardless of run order. Picking two different real feature names (init only recognizes known feature
    // keys, so these can't be made-up strings) sidesteps that entirely.
    const autoStartFeatureName = FEATURE_NAMES.metrics
    const neverStartedFeatureName = FEATURE_NAMES.genericEvents
    agent = setupAgent({
      init: {
        [autoStartFeatureName]: { autoStart: true },
        [neverStartedFeatureName]: { autoStart: false } // deliberately never started below
      }
    })

    const autoStartedInstrument = new InstrumentBase(agent, autoStartFeatureName)
    const neverStartedInstrument = new InstrumentBase(agent, neverStartedFeatureName)
    agent.features[autoStartFeatureName] = autoStartedInstrument
    agent.features[neverStartedFeatureName] = neverStartedInstrument

    // Spy at the prototype level (mirrors setup-agent.js's approach for Connector/Harvester) since no instance
    // exists yet -- agentRef.runtime.harvester is created asynchronously, inside ensureRuntimeBootstrap.
    const startTimerSpy = jest.spyOn(Harvester.prototype, 'startTimer')

    autoStartedInstrument.importAggregator(agent, () => Promise.resolve({ Aggregate: TrivialAggregate }))
    neverStartedInstrument.importAggregator(agent, () => Promise.resolve({ Aggregate: TrivialAggregate }))

    await autoStartedInstrument.onAggregateImported
    // Let the fire-and-forget Promise.all(...).then(startTimer) chain in ensureRuntimeBootstrap settle.
    await new Promise(process.nextTick)
    await new Promise(process.nextTick)

    expect(startTimerSpy).toHaveBeenCalled()

    let neverStartedResolved = false
    neverStartedInstrument.onAggregateImported.then(() => { neverStartedResolved = true })
    await new Promise(process.nextTick)
    expect(neverStartedResolved).toEqual(false)

    startTimerSpy.mockRestore()
  })
})
