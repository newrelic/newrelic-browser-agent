import { ProcessedEvents } from '../../../../src/common/storage/processed-events'
import { getStorageInstance } from '../../../../src/features/utils/processed-events-util'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

describe('getStorageInstace', () => {
  test('creates new ProcessedEvents', () => {
    const runtimeObj = {}
    const result1 = getStorageInstance(FEATURE_NAMES.ajax, runtimeObj)
    expect(result1 instanceof ProcessedEvents).toBeTruthy()
    expect(runtimeObj).toEqual({ events: [result1] })

    const result2 = getStorageInstance(FEATURE_NAMES.pageViewTiming, runtimeObj)
    expect(result2 instanceof ProcessedEvents).toBeTruthy()
    expect(result2).not.toBe(result1)
    expect(runtimeObj.events).toEqual([result1, result2])
  })

  test('fetches same ProcessedEvents for combineable endpoints', () => {
    const runtimeObj = {}
    const result1 = getStorageInstance(FEATURE_NAMES.jserrors, runtimeObj)
    expect(runtimeObj).toEqual({ jserrors: [result1] })

    const result2 = getStorageInstance(FEATURE_NAMES.metrics, runtimeObj)
    expect(result2).toBe(result1)
    expect(runtimeObj.jserrors).toEqual([result1])
  })
})
