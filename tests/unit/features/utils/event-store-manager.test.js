import { EventAggregator } from '../../../../src/common/aggregate/event-aggregator'
import { EntityManager } from '../../../../src/features/utils/entity-manager'
import { EventBuffer } from '../../../../src/features/utils/event-buffer'
import { EventStoreManager } from '../../../../src/features/utils/event-store-manager'

const entityGuid = '12345'
const info = { licenseKey: '12345', applicationID: '67890' }
const entity = { entityGuid, ...info }
const entityManager = new EntityManager({ info, ee: { emit: jest.fn() } })
entityManager.setDefaultEntity(entity)
entityManager.set(entityGuid, entity)
const mockAgentRef = { info, runtime: { entityManager, appMetadata: { agents: [{ entityGuid }] } } }
describe('EventStoreManager', () => {
  test('uses EventBuffer class when storageChoice is EventBuffer', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.StorageClass.name).toEqual('EventBuffer')
  })
  test('uses EventAggregator class when storageChoice is EventAggregator', () => {
    const store = new EventStoreManager(mockAgentRef, EventAggregator, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.StorageClass.name).toEqual('EventAggregator')
  })

  test('has the required common methods defined', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.isEmpty).toBeDefined()
    expect(store.add).toBeDefined()
    expect(store.addMetric).toBeDefined()
    expect(store.get).toBeDefined()
    expect(store.byteSize).toBeDefined()
    expect(store.wouldExceedMaxSize).toBeDefined()
    expect(store.save).toBeDefined()
    expect(store.clear).toBeDefined()
    expect(store.reloadSave).toBeDefined()
    expect(store.clearSave).toBeDefined()
  })

  test('has agentIdentifier and featureName defined', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.agentIdentifier).toEqual(mockAgentRef.agentIdentifier)
    expect(store.featureName).toEqual('test')
  })

  test('calls the underlying StorgeClass add, get, isEmpty methods', () => {
    const myTarget = 'abcd1234'
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')

    let myEventBuffer = store.appStorageMap.get(myTarget)
    expect(myEventBuffer).toBeUndefined() // has never had a read or write from the ESM

    store.add('myEvent', myTarget)

    myEventBuffer = store.appStorageMap.get(myTarget)

    expect(myEventBuffer.constructor.name).toEqual('EventBuffer')
    expect(store.get({}, myTarget)[0].data).toEqual(myEventBuffer.get())
  })

  test('add uses default target when target is not provided', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    const myEventBuffer = store.appStorageMap.get(mockAgentRef.runtime.appMetadata.agents[0].entityGuid)

    expect(store.get()[0].data).toEqual(myEventBuffer.get())
  })

  test('add does not error when target does not exist', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(() => store.add('myEvent', 'DNE')).not.toThrow()
  })

  test('get takes from ALL storages when target is not provided', () => {
    const tgt1 = 'myTarget'
    const tgt1Meta = { licenseKey: '1', applicationID: '1' }
    const tgt2 = 'otherTarget'
    const tgt2Meta = { licenseKey: '2', applicationID: '2' }

    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    store.entityManager.set(tgt1, tgt1Meta)
    store.entityManager.set(tgt2, tgt2Meta)

    store.add('evt0') // no target (default entity)
    store.add('evt1', tgt1)
    store.add('evt2', tgt2)

    expect(store.get()).toEqual([{ targetApp: entity, data: ['evt0'] }, { targetApp: tgt1Meta, data: ['evt1'] }, { targetApp: tgt2Meta, data: ['evt2'] }])
  })

  test('get does not error when target does not exist', () => {
    const myTarget = 'abcd1234'
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(() => store.get(undefined, myTarget)).not.toThrow()
    expect(store.get(undefined, myTarget)).toEqual([{ targetApp: undefined, data: [] }])

    // on top of that, we never added to the default app, and a default get should not error either
    expect(store.get()[0]).toEqual({ targetApp: entity, data: [] })
  })

  test('isEmpty checks ALL storages when target is not provided', () => {
    const tgt1 = 'myTarget'
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.isEmpty()).toBeTruthy()
    store.add('myEvent', tgt1)
    expect(store.isEmpty()).toBeFalsy()
    store.clear()
    expect(store.isEmpty()).toBeTruthy()

    store.add('evt2', 'otherTarget')
    expect(store.isEmpty()).toBeFalsy()
    expect(store.isEmpty(undefined, tgt1)).toBeTruthy()
    store.add('evt1', tgt1)
    expect(store.isEmpty()).toBeFalsy()

    store.clear()
    expect(store.isEmpty()).toBeTruthy()
  })

  test('isEmpty returns true when the target does not exist', () => {
    const store = new EventStoreManager(mockAgentRef, EventBuffer, mockAgentRef.runtime.appMetadata.agents[0].entityGuid, 'test')
    expect(store.isEmpty(undefined, { name: 'DNE' })).toEqual(true)
  })
})
