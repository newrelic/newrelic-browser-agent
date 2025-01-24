import { faker } from '@faker-js/faker'
import { getNREUMInitializedAgent, setNREUMInitializedAgent } from '../../src/common/window/nreum'
import { configure } from '../../src/loaders/configure/configure'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import { TimeKeeper } from '../../src/common/timing/time-keeper'
import { getRuntime } from '../../src/common/config/runtime'
import { setupAgentSession } from '../../src/features/utils/agent-session'
import { Harvester } from '../../src/common/harvest/harvester'
import { EntityManager } from '../../src/features/utils/entity-manager'
import { EventStoreManager } from '../../src/features/utils/event-store-manager'
import { EventAggregator } from '../../src/common/aggregate/event-aggregator'

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

  if (!info.applicationID) info.applicationID = faker.string.uuid()
  if (!info.licenseKey) info.licenseKey = faker.string.uuid()
  if (!loaderConfig.agentID) loaderConfig.agentID = info.applicationID
  if (!loaderConfig.agentID) loaderConfig.licenseKey = info.licenseKey
  if (!runtime.appMetadata) runtime.appMetadata = { agents: [{ entityGuid: faker.string.uuid() }] }
  if (!runtime.entityManager) runtime.entityManager = new EntityManager({ info })

  const eventEmitter = ee.get(agentIdentifier)
  jest.spyOn(eventEmitter, 'on')
  jest.spyOn(eventEmitter, 'addEventListener')

  const fakeAgent = {
    agentIdentifier,
    ee: eventEmitter,
    ...agentOverrides
  }
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  configure(
    fakeAgent,
    { info, init, loader_config: loaderConfig, runtime, exposed: true },
    'browser-test',
    true
  )
  setupAgentSession(fakeAgent)

  runtime = getRuntime(agentIdentifier)
  if (!runtime.timeKeeper) {
    runtime.timeKeeper = new TimeKeeper(agentIdentifier)
    runtime.timeKeeper.processRumRequest({
      getResponseHeader: jest.fn(() => (new Date()).toUTCString())
    }, 450, 600, Date.now())
  }
  fakeAgent.features = {}
  if (!runtime.harvester) runtime.harvester = new Harvester(fakeAgent)
  fakeAgent.sharedAggregator = new EventStoreManager(fakeAgent, EventAggregator)

  return fakeAgent
}

export function resetAgent (agentIdentifier) {
  resetAgentEventEmitter(agentIdentifier)
  resetAggregator(agentIdentifier)
  resetSession(agentIdentifier)
}

export function resetAgentEventEmitter (agentIdentifier) {
  const eventEmitter = ee.get(agentIdentifier)
  const listeners = [
    ...jest.mocked(eventEmitter.on).mock.calls,
    ...jest.mocked(eventEmitter.addEventListener).mock.calls
  ]

  listeners.forEach(([type, fn]) => eventEmitter.removeEventListener(type, fn))
}

export function resetAggregator (agentIdentifier) {
  const agent = getNREUMInitializedAgent(agentIdentifier)
  agent.sharedAggregator.clear()
}

export function resetSession (agentIdentifier) {
  const runtime = getRuntime(agentIdentifier)
  runtime.session.reset()
}
