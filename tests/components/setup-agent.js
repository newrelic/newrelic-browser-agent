import { faker } from '@faker-js/faker'
import { setNREUMInitializedAgent } from '../../src/common/window/nreum'
import { configure } from '../../src/loaders/configure/configure'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import { TimeKeeper } from '../../src/common/timing/time-keeper'
import { Connector } from '../../src/common/harvest/connector'
import { Harvester } from '../../src/common/harvest/harvester'
import { EventAggregator } from '../../src/common/aggregate/event-aggregator'

const entityGuid = faker.string.uuid()

/**
 * Sets up a new agent for component testing. This should be called only
 * once per test file. Jest runs each set file in an isolated context but
 * tests within the same file will share the same globals like NREUM.
 *
 * Instead of creating a new agent for each test, you can re-instantiate
 * the instrument or aggregate class.
 *
 * @param agentOverrides
 * @param info
 * @param init
 * @param loaderConfig
 * @param runtime
 * @returns {{aggregator: Aggregator, agentIdentifier: string, licenseKey: string}}
 */
export function setupAgent ({ agentOverrides = {}, info = {}, init = {}, loaderConfig = {}, runtime = {} } = {}) {
  const agentIdentifier = faker.string.uuid()

  const eventEmitter = ee.get(agentIdentifier)
  jest.spyOn(eventEmitter, 'on')
  jest.spyOn(eventEmitter, 'addEventListener')
  jest.spyOn(eventEmitter, 'emit')

  if (!info.applicationID) info.applicationID = faker.string.uuid()
  if (!info.licenseKey) info.licenseKey = faker.string.uuid()
  if (!loaderConfig.agentID) loaderConfig.agentID = info.applicationID
  if (!loaderConfig.agentID) loaderConfig.licenseKey = info.licenseKey
  if (!runtime.appMetadata) runtime.appMetadata = { agents: [{ entityGuid }] }

  const fakeAgent = {
    agentIdentifier,
    ee: eventEmitter,
    ...agentOverrides
  }
  fakeAgent.beacons = setBeacons(info, init)
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  configure(
    fakeAgent,
    { info, init, loader_config: loaderConfig, runtime, exposed: true },
    'browser-test',
    true
  )
  /* Deliberately does NOT set up `runtime.session`/`runtime.connector`/`runtime.harvester` here: the real
  runtime bootstrap (`ensureRuntimeBootstrap` in instrument-base.js) creates all three exactly once, the
  first time any feature's own `importAggregator` runs for this agent. Every caller of `setupAgent()`
  constructs a real Instrument before touching those properties, so pre-creating them here would just be
  guessing at values the real bootstrap is about to replace anyway. */

  /* TimeKeeper is the one exception: it's normally created either by the rum_v2 Connector or by the v1 PVE
  aggregate (see src/features/page_view_event/aggregate/index.js), so tests for any OTHER feature never
  get one "for free" -- they need this fallback. */
  if (!fakeAgent.runtime.timeKeeper) {
    fakeAgent.runtime.timeKeeper = new TimeKeeper(fakeAgent.runtime.session)
    fakeAgent.runtime.timeKeeper.processRumRequest({}, 450, 600, Date.now())
  }
  fakeAgent.features = {}
  fakeAgent.sharedAggregator = new EventAggregator()

  // Spy at the prototype level (rather than on an instance) for both classes, since no instance may exist
  // yet -- a prototype spy tracks calls on whichever instance `ensureRuntimeBootstrap` eventually creates.
  // Skip a class whose module is jest.mock()'d (automock assigns mocked methods per-instance, not on the
  // prototype), in which case every new instance already gets its own working jest.fn() for that method.
  if (typeof Connector.prototype.makeConnectRequest === 'function') {
    jest.spyOn(Connector.prototype, 'makeConnectRequest')
  }
  if (typeof Harvester.prototype.triggerHarvestFor === 'function') {
    jest.spyOn(Harvester.prototype, 'triggerHarvestFor')
  }

  return fakeAgent
}

export function resetAgent (agentRef) {
  resetAgentEventEmitter(agentRef)
  resetAggregator(agentRef)
  resetSession(agentRef)
  agentRef.runtime.isRecording = false
}

function setBeacons (info, init) {
  const beacons = new Set([info.beacon, info.errorBeacon])
  if (init.proxy?.beacon) beacons.add(init.proxy.beacon)
  return [...beacons]
}

function resetAgentEventEmitter (agentRef) {
  const eventEmitter = agentRef.ee
  const onCalls = eventEmitter.on?.mock?.calls || []
  const addEventListenerCalls = eventEmitter.addEventListener?.mock?.calls || []
  const listeners = [...onCalls, ...addEventListenerCalls]

  listeners.forEach(([type, fn]) => eventEmitter.removeEventListener(type, fn))

  eventEmitter.backlog = {}
}

function resetAggregator (agentRef) {
  agentRef.sharedAggregator.clear()
}

function resetSession (agentRef) {
  agentRef.runtime.session?.reset()
}
