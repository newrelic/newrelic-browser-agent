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

  describe('merge', () => {
    it('should merge data if matcher is satisfied', () => {
      const alwaysPositiveMatcher = () => true
      eventBuffer.add({ foo: 'bar', target: 1 })
      expect(eventBuffer.merge(alwaysPositiveMatcher, { target: 2 })).toEqual(true)

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 2 })
    })

    it('should merge data if matcher is not satisfied', () => {
      const alwaysNegativeMatcher = () => false
      eventBuffer.add({ foo: 'bar', target: 1 })
      expect(eventBuffer.merge(alwaysNegativeMatcher, { target: 2 })).toEqual(false)

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 1 })
    })

    it('matcher should be able to match data inside the buffer', () => {
      const matcher = (d) => d.foo === 'bar'
      eventBuffer.add({ foo: 'bar', target: 1 })
      expect(eventBuffer.merge(matcher, { target: 2 })).toEqual(true)

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 2 })
    })

    it('merges only with first match', () => {
      const matcher = (d) => d.foo === 'bar'
      eventBuffer.add({ foo: 'bar', target: 1 })
      eventBuffer.add({ foo: 'bar', target: 3 })
      expect(eventBuffer.merge(matcher, { target: 2 })).toEqual(true)

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 2 })
      expect(eventBuffer.get()[1]).toEqual({ foo: 'bar', target: 3 })
    })

    it('skips and returns false if buffer is empty', () => {
      const matcher = () => true
      const returnValue = eventBuffer.merge(matcher, { target: 2 })

      expect(eventBuffer.get()).toEqual([])
      expect(returnValue).toEqual(false)
    })

    it('skips and returns false if no matcher is supplied', () => {
      const returnValue = eventBuffer.merge(undefined, { target: 2 })

      expect(eventBuffer.get()).toEqual([])
      expect(returnValue).toEqual(false)
    })

    it('returns true if match was found and merged', () => {
      const matcher = () => true
      eventBuffer.add({ foo: 'bar', target: 1 })
      const returnValue = eventBuffer.merge(matcher, { target: 2 })

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 2 })
      expect(returnValue).toEqual(true)
    })

    it('returns false if match was not found', () => {
      const matcher = () => false
      eventBuffer.add({ foo: 'bar', target: 1 })
      const returnValue = eventBuffer.merge(matcher, { target: 2 })

      expect(eventBuffer.get()[0]).toEqual({ foo: 'bar', target: 1 })
      expect(returnValue).toEqual(false)
    })
  })

  describe('length', () => {
    test('length getter is equivalent to buffer get length', () => {
      expect(eventBuffer.length).toEqual(eventBuffer.get().length)
      eventBuffer.add({ foo: 'bar' })
      expect(eventBuffer.length).toEqual(eventBuffer.get().length)
    })
  })

  describe('clear', () => {
    test('clearBeforeTime removes events before a certain time', () => {
      const now = Date.now()
      eventBuffer.add({ foo: 'bar', timestamp: now - 1000 })
      eventBuffer.add({ foo: 'baz', timestamp: now - 500 })
      eventBuffer.add({ foo: 'qux', timestamp: now })

      eventBuffer.clear({ clearBeforeTime: now - 250, timestampKey: 'timestamp' })

      expect(eventBuffer.length).toEqual(1)
      const payload = [{ foo: 'qux', timestamp: now }]
      expect(eventBuffer.get()).toEqual(payload)
      expect(eventBuffer.byteSize()).toEqual(JSON.stringify(payload).length)
    })

    test('clearBeforeIndex removes events before a certain index', () => {
      eventBuffer.add({ foo: 'bar', index: 0 })
      eventBuffer.add({ foo: 'baz', index: 1 })
      eventBuffer.add({ foo: 'qux', index: 2 })

      eventBuffer.clear({ clearBeforeIndex: 1 })

      expect(eventBuffer.length).toEqual(2)
      const payload = [{ foo: 'baz', index: 1 }, { foo: 'qux', index: 2 }]
      expect(eventBuffer.get()).toEqual(payload)
      expect(eventBuffer.byteSize()).toEqual(JSON.stringify(payload).length)
    })

    test('clear wipes the buffer', () => {
      eventBuffer.add('test')
      expect(eventBuffer.isEmpty()).toEqual(false)
      expect(eventBuffer.byteSize()).toBeGreaterThan(0)
      eventBuffer.clear()
      expect(eventBuffer.isEmpty()).toEqual(true)
      expect(eventBuffer.byteSize()).toEqual(0)
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
