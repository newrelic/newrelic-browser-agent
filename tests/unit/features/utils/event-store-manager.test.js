import { EventStoreManager } from '../../../../src/features/utils/event-store-manager'

describe('EventStoreManager', () => {
  test('uses EventBuffer class when storageChoice is 1', () => {
    const store = new EventStoreManager({}, 1)
    expect(store.StorageClass.name).toEqual('EventBuffer')
  })
  test('uses EventAggregator class when storageChoice is 2', () => {
    const store = new EventStoreManager({}, 2)
    expect(store.StorageClass.name).toEqual('EventAggregator')
  })

  test('has the required common methods defined', () => {
    const store = new EventStoreManager({})
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

  test('calls the underlying StorgeClass add, get, isEmpty methods', () => {
    const myTarget = { name: 'myTarget' }
    const store = new EventStoreManager(myTarget, 1)
    const myEventBuffer = store.appStorageMap.get(myTarget)

    expect(myEventBuffer.constructor.name).toEqual('EventBuffer')
    jest.spyOn(myEventBuffer, 'add')
    jest.spyOn(myEventBuffer, 'get')
    jest.spyOn(myEventBuffer, 'isEmpty')

    store.add('myEvent', myTarget)
    store.get({}, myTarget)
    store.isEmpty({}, myTarget)

    expect(myEventBuffer.add).toHaveBeenCalled()
    expect(myEventBuffer.get).toHaveBeenCalled()
    expect(myEventBuffer.isEmpty).toHaveBeenCalled()
  })

  test('add uses original target when target is not provided', () => {
    const myTarget = { name: 'myTarget' }
    const store = new EventStoreManager(myTarget, 1)
    const myEventBuffer = store.appStorageMap.get(myTarget)

    jest.spyOn(myEventBuffer, 'add')
    expect(store.add('myEvent')).toBeTruthy()
    expect(myEventBuffer.add).toHaveBeenCalledWith('myEvent')
  })

  test('add does not error when target does not exist', () => {
    const store = new EventStoreManager({}, 1)
    expect(() => store.add('myEvent', { name: 'DNE' })).not.toThrow()
  })

  test('get takes from ALL storages when target is not provided', () => {
    const tgt1 = { name: 'myTarget' }
    const tgt2 = { name: 'otherTarget' }
    const store = new EventStoreManager(tgt1, 1)
    store.add('evt1', tgt1)
    store.add('evt2', tgt2)

    expect(store.get()).toEqual([{ targetApp: tgt1, data: ['evt1'] }, { targetApp: tgt2, data: ['evt2'] }])
  })

  test('get does not error when target does not exist', () => {
    const myTarget = { name: 'myTarget' }
    const store = new EventStoreManager(myTarget, 1)
    expect(() => store.get(undefined, { name: 'DNE' })).not.toThrow()
    expect(store.get(undefined, { name: 'DNE' })).toEqual([{ targetApp: { name: 'DNE' }, data: undefined }])

    // on top of that, we never added to the default app, and a default get should not error either
    expect(store.get(undefined, myTarget)).toEqual([{ targetApp: myTarget, data: [] }])
  })

  test('isEmpty checks ALL storages when target is not provided', () => {
    const tgt1 = { name: 'myTarget' }
    const store = new EventStoreManager(tgt1, 1)
    expect(store.isEmpty()).toBeTruthy()
    store.add('myEvent', tgt1)
    expect(store.isEmpty()).toBeFalsy()
    store.clear()
    expect(store.isEmpty()).toBeTruthy()

    store.add('evt2', { name: 'otherTarget' })
    expect(store.isEmpty()).toBeFalsy()
    expect(store.isEmpty(undefined, tgt1)).toBeTruthy()
    store.add('evt1', tgt1)
    expect(store.isEmpty()).toBeFalsy()

    store.clear()
    expect(store.isEmpty()).toBeTruthy()
  })
})
