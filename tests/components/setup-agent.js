import { faker } from '@faker-js/faker'
import { setNREUMInitializedAgent } from '../../src/common/window/nreum'
import { configure } from '../../src/loaders/configure/configure'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import { TimeKeeper } from '../../src/common/timing/time-keeper'
import { setupAgentSession } from '../../src/features/utils/agent-session'
import { Harvester } from '../../src/common/harvest/harvester'
import { EventAggregator } from '../../src/common/aggregate/event-aggregator'
import { canEnableSessionTracking } from '../../src/features/utils/feature-gates'

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
  if (canEnableSessionTracking(fakeAgent.init)) {
    setupAgentSession(fakeAgent)
  }

  if (!fakeAgent.runtime.timeKeeper) {
    fakeAgent.runtime.timeKeeper = new TimeKeeper(fakeAgent.runtime.session)
    fakeAgent.runtime.timeKeeper.processRumRequest({}, 450, 600, Date.now())
  }
  fakeAgent.features = {}
  if (!fakeAgent.runtime.harvester) fakeAgent.runtime.harvester = new Harvester(fakeAgent)
  fakeAgent.sharedAggregator = new EventAggregator()

  jest.spyOn(fakeAgent.runtime.harvester, 'triggerHarvestFor')

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
  agentRef.runtime.session.reset()
}
