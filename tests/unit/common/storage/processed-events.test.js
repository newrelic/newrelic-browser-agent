import { MAX_PAYLOAD_SIZE } from '../../../../src/common/constants/agent-constants'
import { ProcessedEvents } from '../../../../src/common/storage/processed-events'
import { stringify } from '../../../../src/common/util/stringify'

describe('ProcessedEvent class', () => {
  test('can add event and track size', () => {
    const pe = new ProcessedEvents()
    expect(pe.addEvent('123')).toBeTruthy()
    expect(pe.events.length).toEqual(1)
    expect(pe.eventsRawSize).toEqual(5)

    pe.addEvent({ a: 'b', c: 'd' })
    expect(pe.events.length).toEqual(2)
    expect(pe.eventsRawSize).toEqual(5 + stringify({ a: 'b', c: 'd' }).length)
  })

  test('drops event if it would cause payload limit to exceed', () => {
    const pe = new ProcessedEvents()
    pe.eventsRawSize = MAX_PAYLOAD_SIZE - 1
    expect(pe.addEvent('some long string')).toEqual(false)
    expect(pe.events.length).toEqual(0)
    expect(pe.eventsRawSize).toEqual(MAX_PAYLOAD_SIZE - 1)
  })

  test('returns as-is payload on makeHarvestPayload', () => {
    const pe = new ProcessedEvents()
    expect(pe.makeHarvestPayload()).toBeUndefined()

    pe.addEvent('abc')
    pe.addEvent(123)
    expect(pe.makeHarvestPayload()).toEqual({ body: ['abc', 123] })
    expect(pe.events.length).toEqual(0) // that it was reset
    expect(pe.eventsRawSize).toEqual(0)
  })

  test('events are backed up with shouldRetryOnFail arg', () => {
    const pe = new ProcessedEvents()
    pe.addEvent(['blah'])
    pe.makeHarvestPayload(true)
    expect(pe.eventsBackup).toEqual([['blah']])
    expect(pe.eventsBackupRawSize).toEqual(8)
  })

  test('uses serializer when provided', () => {
    const serializer = (arr) => {
      let payload = ''
      arr.forEach(elem => (payload += 'a' + elem))
      return payload
    }
    const pe = new ProcessedEvents({ serializer })
    pe.addEvent(1)
    pe.addEvent(2)
    expect(pe.makeHarvestPayload()).toEqual({ body: 'a1a2' })
  })

  test('postHarvestCleanup on success', () => {
    const pe = new ProcessedEvents()
    pe.eventsBackup = [1]
    pe.eventsBackupRawSize = 1
    pe.postHarvestCleanup()
    expect(pe.eventsBackup).toBeUndefined()
    expect(pe.eventsBackupRawSize).toEqual(0)
  })

  test('postHarvestCleanup on failure with arg', () => {
    const pe = new ProcessedEvents()
    pe.eventsBackup = [1, 3]
    pe.eventsBackupRawSize = 2
    pe.events = [2]
    pe.eventsRawSize = 1
    pe.postHarvestCleanup(true)
    expect(pe.events).toEqual([1, 3, 2]) // chrono order is maintained
    expect(pe.eventsRawSize).toEqual(3)
    expect(pe.eventsBackup).toBeUndefined()

    pe.eventsBackup = ['defined']
    pe.eventsBackupRawSize = MAX_PAYLOAD_SIZE
    pe.postHarvestCleanup(true)
    expect(pe.events).toEqual([1, 3, 2]) // that old events are dropped if combined size exceeds
    expect(pe.eventsRawSize).toEqual(3)
    expect(pe.eventsBackupRawSize).toEqual(0) // backup is still cleared
  })
})
