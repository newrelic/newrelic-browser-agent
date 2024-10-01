import { AggregatedUserAction } from '../../../../../../src/features/generic_events/aggregate/user-actions/aggregated-user-action'
import { RAGE_CLICK_THRESHOLD_EVENTS, RAGE_CLICK_THRESHOLD_MS } from '../../../../../../src/features/generic_events/constants'

describe('AggregatedUserAction', () => {
  let evt
  let selectorPath
  let aggregatedUserAction

  beforeEach(() => {
    evt = { type: 'click', timeStamp: 1000 }
    selectorPath = 'body > div'
    aggregatedUserAction = new AggregatedUserAction(evt, selectorPath)
  })

  test('should initialize with correct values', () => {
    expect(aggregatedUserAction.event).toBe(evt)
    expect(aggregatedUserAction.count).toBe(1)
    expect(aggregatedUserAction.originMs).toBe(1000)
    expect(aggregatedUserAction.relativeMs).toEqual([0])
    expect(aggregatedUserAction.selectorPath).toBe(selectorPath)
    expect(aggregatedUserAction.rageClick).toBeUndefined()
  })

  test('should aggregate events correctly', () => {
    const newEvt = { type: 'click', timeStamp: 1050 }
    aggregatedUserAction.aggregate(newEvt)

    expect(aggregatedUserAction.count).toBe(2)
    expect(aggregatedUserAction.relativeMs).toEqual([0, 50])
    expect(aggregatedUserAction.rageClick).toBeUndefined()
  })

  test('should detect rage click correctly', () => {
    for (let i = 1; i < RAGE_CLICK_THRESHOLD_EVENTS; i++) {
      aggregatedUserAction.aggregate({ type: 'click', timeStamp: 1000 + i * (RAGE_CLICK_THRESHOLD_MS / RAGE_CLICK_THRESHOLD_EVENTS) })
    }

    expect(aggregatedUserAction.count).toBe(RAGE_CLICK_THRESHOLD_EVENTS)
    expect(aggregatedUserAction.isRageClick()).toBe(true)
    expect(aggregatedUserAction.rageClick).toBe(true)
  })

  test('should not detect rage click if events are too far apart', () => {
    for (let i = 1; i < RAGE_CLICK_THRESHOLD_EVENTS; i++) {
      aggregatedUserAction.aggregate({ type: 'click', timeStamp: 1000 + i * (RAGE_CLICK_THRESHOLD_MS + 1) })
    }

    expect(aggregatedUserAction.count).toBe(RAGE_CLICK_THRESHOLD_EVENTS)
    expect(aggregatedUserAction.isRageClick()).toBe(false)
    expect(aggregatedUserAction.rageClick).toBeUndefined()
  })
})
