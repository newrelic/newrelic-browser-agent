import { MAX_PAYLOAD_SIZE } from '../../../../src/common/constants/agent-constants'
import { EventBuffer } from '../../../../src/features/utils/event-buffer'

let eventBuffer
describe('EventBuffer', () => {
  beforeEach(() => {
    eventBuffer = new EventBuffer(MAX_PAYLOAD_SIZE)
  })
  it('has default values', () => {
    expect(eventBuffer).toEqual({
      maxPayloadSize: expect.any(Number)
    })
  })

  describe('add', () => {
    it('should add data to the buffer while maintaining size', () => {
      expect([eventBuffer.isEmpty(), eventBuffer.byteSize()]).toEqual([true, 0])

      const mockEvent = { test: 1 }

      eventBuffer.add(mockEvent)
      expect([eventBuffer.get(), eventBuffer.byteSize()]).toEqual([[mockEvent], JSON.stringify(mockEvent).length])
    })

    it('should not add if one event is too large', () => {
      expect(eventBuffer.add({ test: 'x'.repeat(MAX_PAYLOAD_SIZE) })).toEqual(false) // exceeds because of quote chars
      expect(eventBuffer.isEmpty()).toEqual(true)
    })

    it('should not add if existing buffer would become too large', () => {
      eventBuffer.add({ test: 'x'.repeat(999988) })
      expect(eventBuffer.isEmpty()).toEqual(false)
      expect(eventBuffer.byteSize()).toEqual(999999)
      eventBuffer.add({ test2: 'testing' })
      expect(eventBuffer.byteSize()).toEqual(999999)
      expect(eventBuffer.get().length).toEqual(1)
    })
  })

  test('wouldExceedMaxSize returns boolean and does not actually add', () => {
    expect(eventBuffer.wouldExceedMaxSize(MAX_PAYLOAD_SIZE + 1)).toEqual(true)
    expect(eventBuffer.wouldExceedMaxSize(MAX_PAYLOAD_SIZE)).toEqual(false)
    expect(eventBuffer.isEmpty()).toEqual(true)

    expect(eventBuffer.add('x'.repeat(MAX_PAYLOAD_SIZE - 2))).toEqual(true) // the 2 bytes are for the quotes
    expect(eventBuffer.wouldExceedMaxSize(1)).toEqual(true)
    expect(eventBuffer.byteSize()).toEqual(MAX_PAYLOAD_SIZE)
  })

  test('clear wipes the buffer', () => {
    eventBuffer.add('test')
    expect(eventBuffer.isEmpty()).toEqual(false)
    expect(eventBuffer.byteSize()).toBeGreaterThan(0)
    eventBuffer.clear()
    expect(eventBuffer.isEmpty()).toEqual(true)
    expect(eventBuffer.byteSize()).toEqual(0)
  })

  describe('save', () => {
    test('does not clear the buffer on its own', () => {
      eventBuffer.add('test')
      eventBuffer.save()
      expect(eventBuffer.isEmpty()).toEqual(false)
    })

    test('can be reloaded after clearing', () => {
      eventBuffer.add('test')
      eventBuffer.save()
      eventBuffer.clear()
      expect(eventBuffer.isEmpty()).toEqual(true)
      expect(eventBuffer.byteSize()).toEqual(0)
      eventBuffer.reloadSave()
      expect(eventBuffer.isEmpty()).toEqual(false)
      expect(eventBuffer.byteSize()).toEqual(6)
    })

    test('can be reloaded without clearing (doubled data)', () => {
      eventBuffer.add('test')
      eventBuffer.save()
      eventBuffer.reloadSave()
      expect(eventBuffer.get().length).toEqual(2)
      expect(eventBuffer.byteSize()).toEqual(12)
    })
  })

  test('clearSave will clear previous save calls', () => {
    eventBuffer.add('test')
    eventBuffer.save()
    eventBuffer.clearSave() // should nullify previous step
    eventBuffer.reloadSave()
    expect(eventBuffer.get().length).toEqual(1)
    expect(eventBuffer.byteSize()).toEqual(6)
  })

  test('reloadSave will not reload if final size exceeds limit', () => {
    expect(eventBuffer.add('x'.repeat(MAX_PAYLOAD_SIZE - 2))).toEqual(true)
    eventBuffer.save()
    eventBuffer.clear()
    expect(eventBuffer.add('x')).toEqual(true)
    expect(eventBuffer.get()).toEqual(['x'])
    eventBuffer.reloadSave()
    expect(eventBuffer.get()).toEqual(['x']) // should not have reloaded because combined would exceed max
    eventBuffer.clear() // now the buffer is emptied
    eventBuffer.reloadSave() // so this should work now
    expect(eventBuffer.get()).toEqual(['x'.repeat(MAX_PAYLOAD_SIZE - 2)])
  })
})
