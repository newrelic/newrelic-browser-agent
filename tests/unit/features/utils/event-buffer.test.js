import { EventBuffer } from '../../../../src/features/utils/event-buffer'

let eventBuffer
describe('EventBuffer', () => {
  beforeEach(() => {
    eventBuffer = new EventBuffer()
  })
  it('has default values', () => {
    expect(eventBuffer).toMatchObject({
      bytes: 0,
      buffer: []
    })
  })

  describe('add', () => {
    it('should add data to the buffer while maintaining size', () => {
      expect(eventBuffer).toMatchObject({
        bytes: 0,
        buffer: []
      })

      const mockEvent = { test: 1 }

      eventBuffer.add(mockEvent)
      expect(eventBuffer).toMatchObject({
        bytes: JSON.stringify(mockEvent).length,
        buffer: [mockEvent]
      })
    })

    it('should not add if one event is too large', () => {
      eventBuffer.add({ test: 'x'.repeat(1000000) })
      expect(eventBuffer.buffer).toEqual([])
    })

    it('should not add if existing buffer would become too large', () => {
      eventBuffer.add({ test: 'x'.repeat(999988) })
      expect(eventBuffer.bytes).toEqual(999999)
      expect(eventBuffer.buffer.length).toEqual(1)
      eventBuffer.add({ test2: 'testing' })
      expect(eventBuffer.bytes).toEqual(999999)
      expect(eventBuffer.buffer.length).toEqual(1)
    })

    it('should be chainable', () => {
      const mockEvent1 = { test: 1 }
      const mockEvent2 = { test: 2 }
      eventBuffer.add(mockEvent1).add(mockEvent2)
      expect(eventBuffer).toMatchObject({
        bytes: JSON.stringify(mockEvent1).length + JSON.stringify(mockEvent2).length,
        buffer: [mockEvent1, mockEvent2]
      })
    })
  })

  describe('merge', () => {
    it('should merge two EventBuffers - append', () => {
      const mockEvent1 = { test: 1 }
      const mockEvent2 = { test: 2 }
      eventBuffer.add(mockEvent1)

      const secondBuffer = new EventBuffer()
      secondBuffer.add(mockEvent2)
      eventBuffer.merge(secondBuffer)
      expect(eventBuffer).toMatchObject({
        bytes: JSON.stringify({ test: 1 }).length + JSON.stringify({ test: 2 }).length,
        buffer: [mockEvent1, mockEvent2]
      })
    })

    it('should merge two EventBuffers - prepend', () => {
      const mockEvent1 = { test: 1 }
      const mockEvent2 = { test: 2 }
      eventBuffer.add(mockEvent1)

      const secondBuffer = new EventBuffer()
      secondBuffer.add(mockEvent2)
      eventBuffer.merge(secondBuffer, true)
      expect(eventBuffer).toMatchObject({
        bytes: JSON.stringify({ test: 1 }).length + JSON.stringify({ test: 2 }).length,
        buffer: [mockEvent2, mockEvent1]
      })
    })

    it('should not merge if not an EventBuffer', () => {
      eventBuffer.add({ test: 1 })
      // not EventBuffer
      eventBuffer.merge({ regular: 'object' })
      expect(eventBuffer.buffer).toEqual([{ test: 1 }])
      // not EventBuffer
      eventBuffer.merge('string')
      expect(eventBuffer.buffer).toEqual([{ test: 1 }])
      // not EventBuffer
      eventBuffer.merge(123)
      expect(eventBuffer.buffer).toEqual([{ test: 1 }])
      // not EventBuffer
      eventBuffer.merge(true)
      expect(eventBuffer.buffer).toEqual([{ test: 1 }])
      // not EventBuffer
      eventBuffer.merge(Symbol('test'))
      expect(eventBuffer.buffer).toEqual([{ test: 1 }])
    })

    it('should not merge if too big', () => {
      const mockEvent1 = { test: 'x'.repeat(999988) }
      const mockEvent2 = { test2: 'testing' }
      eventBuffer.add(mockEvent1)

      const secondBuffer = new EventBuffer()
      secondBuffer.add(mockEvent2)

      eventBuffer.merge(secondBuffer)
      expect(eventBuffer.buffer.length).toEqual(1)
      expect(eventBuffer.bytes).toEqual(999999)
    })

    it('should be chainable', () => {
      const mockEvent1 = { test1: 1 }
      const mockEvent2 = { test2: 2 }
      const mockEvent3 = { test3: 3 }

      const secondBuffer = new EventBuffer()
      const thirdBuffer = new EventBuffer()

      eventBuffer.add(mockEvent1)
      secondBuffer.add(mockEvent2)
      thirdBuffer.add(mockEvent3)

      eventBuffer.merge(secondBuffer).merge(thirdBuffer)
      expect(eventBuffer).toMatchObject({
        bytes: JSON.stringify(mockEvent1).length + JSON.stringify(mockEvent2).length + JSON.stringify(mockEvent3).length,
        buffer: [mockEvent1, mockEvent2, mockEvent3]
      })
    })
  })

  describe('hasData', () => {
    it('should return false if no events', () => {
      jest.spyOn(eventBuffer, 'bytes', 'get').mockReturnValue(100)
      expect(eventBuffer.hasData).toEqual(false)
    })
    it('should return false if no bytes', () => {
      jest.spyOn(eventBuffer, 'buffer', 'get').mockReturnValue({ test: 1 })
      expect(eventBuffer.hasData).toEqual(false)
    })
    it('should return true if has a valid event and size', () => {
      eventBuffer.add({ test: 1 })
      expect(eventBuffer.hasData).toEqual(true)
    })
  })

  describe('canMerge', () => {
    it('should return false if would be too big', () => {
      jest.spyOn(eventBuffer, 'bytes', 'get').mockReturnValue(999999)
      expect(eventBuffer.canMerge(1)).toEqual(false)
    })
    it('should return false if no size provided', () => {
      eventBuffer.add({ test: 1 })
      expect(eventBuffer.canMerge()).toEqual(false)
    })
    it('should return false if size is not a number', () => {
      eventBuffer.add({ test: 1 })
      expect(eventBuffer.canMerge('test')).toEqual(false)
      expect(eventBuffer.canMerge(false)).toEqual(false)
      expect(eventBuffer.canMerge(['test'])).toEqual(false)
      expect(eventBuffer.canMerge({ test: 1 })).toEqual(false)
    })
    it('should return true if has a valid event and size', () => {
      eventBuffer.add({ test: 1 })
      expect(eventBuffer.canMerge(20)).toEqual(true)
    })
  })
})
