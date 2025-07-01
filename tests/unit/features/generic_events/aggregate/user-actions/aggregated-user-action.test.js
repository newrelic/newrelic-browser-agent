import { AggregatedUserAction } from '../../../../../../src/features/generic_events/aggregate/user-actions/aggregated-user-action'
import { RAGE_CLICK_THRESHOLD_EVENTS, RAGE_CLICK_THRESHOLD_MS } from '../../../../../../src/features/generic_events/constants'

describe('AggregatedUserAction', () => {
  let evt
  let selectorPath
  let aggregatedUserAction

  beforeEach(() => {
    evt = { type: 'click', timeStamp: 1000 }
    selectorPath = 'body > div'
    aggregatedUserAction = new AggregatedUserAction(evt, { path: selectorPath })
  })

  test('should initialize with correct values', () => {
    expect(aggregatedUserAction.events[0]).toBe(evt)
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

describe('AggregatedUserAction - Dead Click Detection', () => {
  let evt

  beforeEach(() => {
    evt = { type: 'click', timeStamp: 1000 }
  })

  test('should correctly assess not a dead click - no interactive elems', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, undefined)
    expect(userClickOnDeadlink.deadClick).toBe(false)
  })
  test('should correctly assess not a dead click - no link, no textbox', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasInteractiveElems: true })
    expect(userClickOnDeadlink.deadClick).toBe(false)
  })
  test('should correctly assess not a dead click - has interactive link', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasInteractiveElems: true, hasLink: true })
    expect(userClickOnDeadlink.deadClick).toBe(false)
  })
  test('should correctly detect dead click - link', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasLink: true })
    expect(userClickOnDeadlink.deadClick).toBe(true)
  })
  test('should correctly detect dead click - textbox', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasTextbox: true })
    expect(userClickOnDeadlink.deadClick).toBe(true)
  })
  test('should correctly detect dead click - button', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasButton: true })
    expect(userClickOnDeadlink.deadClick).toBe(true)
  })
  test('should not detect dead click if ignoreDeadClick is true', () => {
    const userClickOnDeadlink = generateAggregatedUserAction(evt, { hasLink: true, ignoreDeadClick: true })
    expect(userClickOnDeadlink.deadClick).toBe(false)
  })
})

describe('AggregatedUserAction - Error Click Detection', () => {
  test('should detect error click when hasInteractiveElems and contains error events', () => {
    const mockClickEvent = { type: 'click' }
    const clickErrorEvents = new Set([mockClickEvent])
    const userAction = new AggregatedUserAction(mockClickEvent, { hasInteractiveElems: true })

    expect(userAction.isErrorClick(clickErrorEvents)).toBe(true)
  })
  test('should not detect error click when hasInteractiveElems is false', () => {
    const mockClickEvent = { type: 'click' }
    const clickErrorEvents = new Set([mockClickEvent])
    const userAction = new AggregatedUserAction(mockClickEvent, { hasInteractiveElems: false })

    expect(userAction.isErrorClick(clickErrorEvents)).toBe(false)
  })
  test('should not detect error click when event does not have error', () => {
    const mockClickEvent = { type: 'click' }
    const clickErrorEvents = new Set()
    const userAction = new AggregatedUserAction(mockClickEvent, { hasInteractiveElems: true })

    expect(userAction.isErrorClick(clickErrorEvents)).toBe(false)
  })
})

function generateAggregatedUserAction (evt, selectorInfo = {
  path: 'dummy value',
  hasInteractiveElems: false,
  hasLink: false,
  hasTextbox: false,
  hasButton: false,
  ignoreDeadClick: false
}) {
  return new AggregatedUserAction(evt, selectorInfo)
}
