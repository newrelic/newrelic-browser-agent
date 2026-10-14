/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('trackMFEViews', () => {
  let trackMFEViews
  let mockDocument
  let mockGlobalScope
  let mutationObservers // every MutationObserver constructed, in order
  let intersectionObservers // every IntersectionObserver constructed, in order (one per tracker)
  let docListeners
  let existing
  let mockVisibility
  let onView
  let target

  const createElem = (opts = {}) => ({
    nodeType: 1,
    isConnected: true,
    dataset: { nrMfeId: 'test-mfe' },
    querySelectorAll: jest.fn(() => []),
    ...opts
  })

  const visibleEntry = (elem, overrides = {}) => ({
    target: elem,
    isIntersecting: true,
    boundingClientRect: { width: 100, height: 50 },
    ...overrides
  })

  /** the single shared mutation observer */
  const mutationObs = () => mutationObservers[0]
  const mutate = (addedNodes = [], removedNodes = []) => mutationObs().callback([{ addedNodes, removedNodes }])
  /** the IntersectionObserver belonging to the nth tracker created */
  const intersect = (n = 0) => intersectionObservers[n]

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    docListeners = []
    existing = []
    mutationObservers = []
    intersectionObservers = []
    mockVisibility = 'visible'

    mockDocument = {
      visibilityState: 'visible',
      querySelectorAll: jest.fn(() => existing),
      addEventListener: jest.fn((type, handler) => { docListeners.push({ type, handler }) }),
      removeEventListener: jest.fn((type, handler) => { docListeners = docListeners.filter(l => l.handler !== handler) })
    }

    mockGlobalScope = {
      CSS: { escape: (v) => v },
      getComputedStyle: jest.fn(() => ({ visibility: mockVisibility })),
      MutationObserver: jest.fn(function (callback) {
        this.callback = callback
        this.observe = jest.fn()
        this.disconnect = jest.fn()
        mutationObservers.push(this)
      }),
      IntersectionObserver: jest.fn(function (callback) {
        this.callback = callback
        this.observe = jest.fn()
        this.unobserve = jest.fn()
        this.disconnect = jest.fn()
        intersectionObservers.push(this)
      }),
      document: mockDocument
    }
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      globalScope: mockGlobalScope,
      isBrowserScope: true
    }))

    ;({ trackMFEViews } = await import('../../../../src/common/v2/mfe-views'))

    onView = jest.fn()
    target = { id: 'test-mfe', name: 'Test MFE', instance: 'abcdefg' }
  })

  it('does nothing without a valid target', () => {
    const tracker = trackMFEViews({}, onView)
    expect(mutationObservers).toHaveLength(0)
    expect(() => tracker.disconnect()).not.toThrow()
  })

  it('does nothing when IntersectionObserver is unsupported', () => {
    delete mockGlobalScope.IntersectionObserver
    const tracker = trackMFEViews(target, onView)
    expect(mutationObservers).toHaveLength(0)
    expect(() => tracker.disconnect()).not.toThrow()
  })

  it('observes the whole document and never narrows to a subtree', () => {
    trackMFEViews(target, onView)
    expect(mutationObs().observe).toHaveBeenCalledWith(mockDocument, { childList: true, subtree: true })
    mutate([createElem()])
    expect(mutationObs().disconnect).not.toHaveBeenCalled()
  })

  it('emits a view when an inserted matching node becomes visible', () => {
    trackMFEViews(target, onView)
    const elem = createElem()
    mutate([elem])
    expect(intersect().observe).toHaveBeenCalledWith(elem)
    expect(onView).not.toHaveBeenCalled() // inserted but not visible yet

    intersect().callback([visibleEntry(elem)])
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(elem)
    expect(intersect().unobserve).toHaveBeenCalledWith(elem)
  })

  it('counts a node already in the DOM when tracking starts', () => {
    const elem = createElem()
    existing = [elem]
    trackMFEViews(target, onView)
    expect(intersect().observe).toHaveBeenCalledWith(elem)
    intersect().callback([visibleEntry(elem)])
    expect(onView).toHaveBeenCalledTimes(1)
  })

  it('finds a matching node nested inside an inserted subtree', () => {
    trackMFEViews(target, onView)
    const nested = createElem()
    const wrapper = createElem({ dataset: {}, querySelectorAll: jest.fn(() => [nested]) })
    mutate([wrapper])
    expect(intersect().observe).toHaveBeenCalledTimes(1)
    expect(intersect().observe).toHaveBeenCalledWith(nested)
  })

  it('ignores non-element nodes and nodes with a different mfe id', () => {
    trackMFEViews(target, onView)
    mutate([createElem({ dataset: { nrMfeId: 'something-else' } }), createElem({ dataset: {} }), { nodeType: 3 }])
    expect(intersect().observe).not.toHaveBeenCalled()
  })

  it('emits one view per distinct node, including multiple concurrent nodes', () => {
    trackMFEViews(target, onView)
    const a = createElem()
    const b = createElem()
    mutate([a, b])
    intersect().callback([visibleEntry(a), visibleEntry(b)])
    expect(onView).toHaveBeenCalledTimes(2)
  })

  it('emits a new view for a genuinely new node after a remount', () => {
    trackMFEViews(target, onView)
    const first = createElem()
    mutate([first])
    intersect().callback([visibleEntry(first)])

    first.isConnected = false
    mutate([], [first])
    const second = createElem()
    mutate([second])
    intersect().callback([visibleEntry(second)])
    expect(onView).toHaveBeenCalledTimes(2)
  })

  it('does not count the same node twice when it is re-inserted', () => {
    trackMFEViews(target, onView)
    const elem = createElem()
    mutate([elem])
    intersect().callback([visibleEntry(elem)])
    mutate([elem]) // moved within the DOM
    expect(intersect().observe).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledTimes(1)
  })

  describe('shared observer', () => {
    it('uses a single MutationObserver no matter how many MFEs are tracked', () => {
      trackMFEViews(target, onView)
      trackMFEViews({ id: 'b', name: 'B', instance: 'i2' }, jest.fn())
      trackMFEViews({ id: 'c', name: 'C', instance: 'i3' }, jest.fn())
      expect(mutationObservers).toHaveLength(1)
      expect(mutationObs().observe).toHaveBeenCalledTimes(1)
    })

    it('fans an inserted node out to the tracker for its own id only', () => {
      const onViewB = jest.fn()
      trackMFEViews(target, onView)
      trackMFEViews({ id: 'b', name: 'B', instance: 'i2' }, onViewB)

      const elemA = createElem()
      const elemB = createElem({ dataset: { nrMfeId: 'b' } })
      mutate([elemA, elemB])
      expect(intersect(0).observe).toHaveBeenCalledWith(elemA)
      expect(intersect(0).observe).not.toHaveBeenCalledWith(elemB)
      expect(intersect(1).observe).toHaveBeenCalledWith(elemB)

      intersect(0).callback([visibleEntry(elemA)])
      intersect(1).callback([visibleEntry(elemB)])
      expect(onView).toHaveBeenCalledTimes(1)
      expect(onViewB).toHaveBeenCalledTimes(1)
    })

    it('does not double-count a node between two instances sharing an id', () => {
      const otherOnView = jest.fn()
      trackMFEViews(target, onView)
      trackMFEViews({ ...target, instance: 'other' }, otherOnView)

      const elem = createElem()
      mutate([elem])
      expect(intersect(0).observe).toHaveBeenCalledWith(elem)
      expect(intersect(1).observe).not.toHaveBeenCalled()

      intersect(0).callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)
      expect(otherOnView).not.toHaveBeenCalled()
    })

    it('keeps observing until the last tracker disconnects, then disconnects and restarts for new trackers', () => {
      const a = trackMFEViews(target, onView)
      const b = trackMFEViews({ id: 'b', name: 'B', instance: 'i2' }, jest.fn())
      a.disconnect()
      expect(mutationObs().disconnect).not.toHaveBeenCalled()
      b.disconnect()
      expect(mutationObs().disconnect).toHaveBeenCalledTimes(1)

      trackMFEViews(target, onView)
      expect(mutationObservers).toHaveLength(2)
      expect(mutationObservers[1].observe).toHaveBeenCalledTimes(1)
    })

    it('stops waiting on a removed unseen node across every tracker', () => {
      trackMFEViews(target, onView)
      trackMFEViews({ id: 'b', name: 'B', instance: 'i2' }, jest.fn())
      const a = createElem()
      const b = createElem({ dataset: { nrMfeId: 'b' } })
      mutate([a, b])
      a.isConnected = false
      b.isConnected = false
      mutate([], [a, b])
      expect(intersect(0).unobserve).toHaveBeenCalledWith(a)
      expect(intersect(1).unobserve).toHaveBeenCalledWith(b)
    })
  })

  describe('claim handoff on disconnect', () => {
    it('hands unseen nodes to the next tracker sharing the id', () => {
      const otherOnView = jest.fn()
      const first = trackMFEViews(target, onView)
      trackMFEViews({ ...target, instance: 'other' }, otherOnView)
      const elem = createElem()
      mutate([elem]) // claimed by the first tracker, not yet visible

      first.disconnect()
      expect(intersect(1).observe).toHaveBeenCalledWith(elem)
      intersect(1).callback([visibleEntry(elem)])
      expect(otherOnView).toHaveBeenCalledTimes(1)
      expect(onView).not.toHaveBeenCalled()
    })

    it('does not hand off nodes the disconnecting tracker already counted', () => {
      const otherOnView = jest.fn()
      const first = trackMFEViews(target, onView)
      trackMFEViews({ ...target, instance: 'other' }, otherOnView)
      const elem = createElem()
      mutate([elem])
      intersect(0).callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)

      first.disconnect()
      expect(intersect(1).observe).not.toHaveBeenCalled()
    })

    it('does not hand off nodes that were removed from the DOM', () => {
      const first = trackMFEViews(target, onView)
      trackMFEViews({ ...target, instance: 'other' }, jest.fn())
      const elem = createElem()
      mutate([elem])
      elem.isConnected = false

      first.disconnect()
      expect(intersect(1).observe).not.toHaveBeenCalled()
    })

    it('lets a later tracker claim a released node when no other tracker exists', () => {
      const only = trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      only.disconnect()

      existing = [elem]
      trackMFEViews({ ...target, instance: 'later' }, jest.fn())
      expect(intersect(1).observe).toHaveBeenCalledWith(elem)
    })

    it('is safe to disconnect more than once', () => {
      const a = trackMFEViews(target, onView)
      trackMFEViews({ id: 'b', name: 'B', instance: 'i2' }, jest.fn())
      a.disconnect()
      expect(() => a.disconnect()).not.toThrow()
      expect(mutationObs().disconnect).not.toHaveBeenCalled() // the second tracker is still active
    })
  })

  describe('visibility', () => {
    it.each([
      ['not intersecting', { isIntersecting: false }],
      ['zero width', { boundingClientRect: { width: 0, height: 50 } }],
      ['zero height', { boundingClientRect: { width: 100, height: 0 } }]
    ])('does not emit a view when %s', (_, overrides) => {
      trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      intersect().callback([visibleEntry(elem, overrides)])
      expect(onView).not.toHaveBeenCalled()
      expect(intersect().unobserve).not.toHaveBeenCalled() // keeps waiting
    })

    it('does not emit a view when the node is visibility:hidden', () => {
      trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      mockVisibility = 'hidden'
      intersect().callback([visibleEntry(elem)])
      expect(onView).not.toHaveBeenCalled()
      expect(intersect().unobserve).not.toHaveBeenCalled() // keeps waiting

      mockVisibility = 'visible'
      intersect().callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)
    })

    it('emits a view if the visibility check itself throws', () => {
      trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      mockGlobalScope.getComputedStyle.mockImplementation(() => { throw new Error('nope') })
      intersect().callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)
    })

    it('emits when a node later scrolls into view', () => {
      trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      intersect().callback([visibleEntry(elem, { isIntersecting: false })])
      intersect().callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)
    })

    it('defers while the tab is hidden and re-evaluates when it becomes visible', () => {
      trackMFEViews(target, onView)
      const elem = createElem()
      mutate([elem])
      mockDocument.visibilityState = 'hidden'
      intersect().callback([visibleEntry(elem)])
      expect(onView).not.toHaveBeenCalled()

      mockDocument.visibilityState = 'visible'
      docListeners.find(l => l.type === 'visibilitychange').handler()
      // re-observing forces a fresh initial notification
      expect(intersect().unobserve).toHaveBeenCalledWith(elem)
      expect(intersect().observe).toHaveBeenCalledTimes(2)
      intersect().callback([visibleEntry(elem)])
      expect(onView).toHaveBeenCalledTimes(1)
    })
  })

  it('stops waiting on a node removed before it was ever visible', () => {
    trackMFEViews(target, onView)
    const elem = createElem()
    mutate([elem])
    elem.isConnected = false
    mutate([], [elem])
    expect(intersect().unobserve).toHaveBeenCalledWith(elem)
    intersect().callback([visibleEntry(elem)])
    expect(onView).not.toHaveBeenCalled()
  })

  it('keeps tracking after the onView callback throws', () => {
    onView.mockImplementationOnce(() => { throw new Error('boom') })
    trackMFEViews(target, onView)
    const a = createElem()
    const b = createElem()
    mutate([a, b])
    expect(() => intersect().callback([visibleEntry(a), visibleEntry(b)])).not.toThrow()
    expect(onView).toHaveBeenCalledTimes(2)
  })

  it('disconnect stops all observation and further views', () => {
    const tracker = trackMFEViews(target, onView)
    const elem = createElem()
    mutate([elem])
    tracker.disconnect()
    expect(mutationObs().disconnect).toHaveBeenCalled()
    expect(intersect().disconnect).toHaveBeenCalled()
    expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function), expect.anything())
    intersect().callback([visibleEntry(elem)])
    expect(onView).not.toHaveBeenCalled()
  })
})
