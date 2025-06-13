import { faker } from '@faker-js/faker'
import { getNREUMInitializedAgent, setNREUMInitializedAgent } from '../../src/common/window/nreum'
import { configure } from '../../src/loaders/configure/configure'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import { TimeKeeper } from '../../src/common/timing/time-keeper'
import { setupAgentSession } from '../../src/features/utils/agent-session'
import { Harvester } from '../../src/common/harvest/harvester'
import { EntityManager } from '../../src/features/utils/entity-manager'
import { EventStoreManager } from '../../src/features/utils/event-store-manager'
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

  if (!info.applicationID) info.applicationID = faker.string.uuid()
  if (!info.licenseKey) info.licenseKey = faker.string.uuid()
  if (!loaderConfig.agentID) loaderConfig.agentID = info.applicationID
  if (!loaderConfig.agentID) loaderConfig.licenseKey = info.licenseKey
  if (!runtime.appMetadata) runtime.appMetadata = { agents: [{ entityGuid }] }
  if (!runtime.entityManager) runtime.entityManager = new EntityManager({ info, ee })

  runtime.entityManager.setDefaultEntity({ entityGuid, ...info })

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

  if (!fakeAgent.runtime.timeKeeper) {
    fakeAgent.runtime.timeKeeper = new TimeKeeper(fakeAgent.runtime.session)
    fakeAgent.runtime.timeKeeper.processRumRequest({}, 450, 600, Date.now())
  }
  fakeAgent.features = {}
  if (!fakeAgent.runtime.harvester) fakeAgent.runtime.harvester = new Harvester(fakeAgent)
  fakeAgent.sharedAggregator = new EventStoreManager(fakeAgent, EventAggregator, fakeAgent.runtime.appMetadata.agents[0].entityGuid, 'shared_aggregator')

  return fakeAgent
}

export function resetAgent (agentIdentifier) {
  resetAgentEventEmitter(agentIdentifier)
  resetAggregator(agentIdentifier)
  resetSession(agentIdentifier)
  resetEntityManager(agentIdentifier)
  getNREUMInitializedAgent(agentIdentifier).runtime.isRecording = false
}

function resetEntityManager (agentIdentifier) {
  const agent = getNREUMInitializedAgent(agentIdentifier)
  const entityManager = agent.runtime.entityManager
  entityManager.clear()
  entityManager.setDefaultEntity({ entityGuid, ...agent.info })
  entityManager.set(entityGuid, { entityGuid, ...agent.info })
}

function resetAgentEventEmitter (agentIdentifier) {
  const eventEmitter = ee.get(agentIdentifier)
  const listeners = [
    ...jest.mocked(eventEmitter.on).mock.calls,
    ...jest.mocked(eventEmitter.addEventListener).mock.calls
  ]

  listeners.forEach(([type, fn]) => eventEmitter.removeEventListener(type, fn))
}

function resetAggregator (agentIdentifier) {
  const agent = getNREUMInitializedAgent(agentIdentifier)
  agent.sharedAggregator.clear()
}

function resetSession (agentIdentifier) {
  const agent = getNREUMInitializedAgent(agentIdentifier)
  agent.runtime.session.reset()
}
