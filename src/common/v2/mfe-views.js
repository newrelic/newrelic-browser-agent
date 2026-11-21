/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope, isBrowserScope } from '../constants/runtime'

/**
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITarget} RegisterAPITarget
 */

/**
 * @typedef {Object} ViewTracker
 * @property {(elem: Element) => void} claim claims the element for this tracker, if nothing has already, and waits for it to be visible
 * @property {() => void} releaseDetached stops waiting on claimed nodes that were removed before they were ever visible
 * @property {() => Set<Element>} abandon stops this tracker and returns the nodes it claimed but never saw as visible
 */

/**
 * Tracks which DOM nodes have already been claimed as a "view" and by which registered instance. A node is only ever
 * counted once, so multiple registered instances sharing an id do not double-count the same node, and a node that is
 * moved (removed and re-inserted) is not counted again. Only a genuinely new node counts as a new view.
 * Kept in a WeakMap, rather than a data attribute, so no extra DOM mutation is made on host-owned nodes.
 * @type {WeakMap<Element, string>}
 */
const claimedNodes = new WeakMap()

/**
 * The active trackers by MFE id, in registration order. The first tracker for an id is the one that claims its nodes.
 * @type {Map<string, ViewTracker[]>}
 */
const trackersById = new Map()

/**
 * A single document-wide MutationObserver shared by every tracker, so the cost of observing DOM churn does not grow with
 * the number of registered MFEs. Created with the first tracker and disconnected when the last one is removed.
 * @type {MutationObserver|undefined}
 */
let sharedObserver

const escapeSelectorValue = (value) => {
  try {
    return globalScope.CSS.escape(value)
  } catch (e) {
    // give up
    return value
  }
}

/**
 * Whether an IntersectionObserver entry represents the node actually being visible to the end user: it must intersect
 * the viewport, have a non-empty box (zero-size containers can report intersecting), and not be `visibility:hidden`.
 * Opacity and overlay occlusion are intentionally not checked: neither triggers an IntersectionObserver notification when
 * it changes, so a failed check could never be re-evaluated. Tab visibility is checked separately.
 * @param {IntersectionObserverEntry} entry
 * @returns {boolean}
 */
const isVisibleEntry = (entry) => {
  if (!entry.isIntersecting) return false
  const { width, height } = entry.boundingClientRect || {}
  if (!(width > 0 && height > 0)) return false
  /* visibility is inherited, so the element's own computed value already reflects hidden ancestors */
  try {
    return globalScope.getComputedStyle(entry.target).visibility !== 'hidden'
  } catch (e) {
    return true
  }
}

/**
 * Hands an inserted element to the first tracker registered for its MFE id, if there is one.
 * @param {Element} elem
 */
const dispatch = (elem) => {
  const id = elem.dataset?.nrMfeId
  if (id !== undefined) trackersById.get(id)?.[0].claim(elem)
}

/**
 * Dispatches an inserted node and any matching descendants, since an MFE root may be inserted inside a larger subtree.
 * @param {Node} node
 */
const dispatchWithin = (node) => {
  if (node.nodeType !== 1) return
  dispatch(node)
  node.querySelectorAll('[data-nr-mfe-id]').forEach(dispatch)
}

const startSharedObserver = () => {
  if (sharedObserver) return
  sharedObserver = new globalScope.MutationObserver(mutations => {
    let removed = false
    mutations.forEach(m => {
      m.addedNodes.forEach(dispatchWithin)
      if (m.removedNodes.length) removed = true
    })
    if (removed) trackersById.forEach(trackers => trackers.forEach(t => t.releaseDetached()))
  })
  sharedObserver.observe(globalScope.document, { childList: true, subtree: true })
}

/**
 * Detects "views" of a registered MFE: each time a new element carrying data-nr-mfe-id="<target.id>" is inserted into
 * the DOM (or already exists when called) and becomes visible, `onView` is called once for that element.
 *
 * This is intentionally separate from the vitals observers, which narrow to a single subtree for performance. A view
 * observer must keep watching the whole document so remounts and multiple concurrent nodes are detected. All trackers
 * share one MutationObserver (see `sharedObserver`).
 * @param {RegisterAPITarget} target - The MFE target to track views for
 * @param {(elem: Element) => void} onView - Called once per newly visible element
 * @returns {{disconnect: () => void}} An object with a disconnect method to stop tracking
 */
export function trackMFEViews (target, onView) {
  const handle = { disconnect: () => {} }
  if (!target?.id || !target?.instance || !isBrowserScope || !globalScope.document ||
    !globalScope.MutationObserver || !globalScope.IntersectionObserver) return handle

  /** @type {Set<Element>} claimed nodes that have not yet been seen visible */
  const pending = new Set()
  /** @type {Set<Element>} pending nodes that intersected while the tab was hidden, re-checked when it is visible again */
  const deferred = new Set()
  let disconnected = false

  const intersectionObs = new globalScope.IntersectionObserver(entries => {
    if (disconnected) return
    entries.forEach(entry => {
      const elem = entry.target
      if (!pending.has(elem) || !isVisibleEntry(entry)) return
      if (globalScope.document.visibilityState === 'hidden') {
        deferred.add(elem)
        return
      }
      pending.delete(elem)
      deferred.delete(elem)
      intersectionObs.unobserve(elem)
      try {
        onView(elem)
      } catch (e) {
        // a failure reporting one view must never break tracking of the next
      }
    })
  })

  /** @type {ViewTracker} */
  const tracker = {
    claim (elem) {
      if (disconnected || claimedNodes.has(elem)) return
      claimedNodes.set(elem, target.instance)
      pending.add(elem)
      intersectionObs.observe(elem)
    },
    releaseDetached () {
      pending.forEach(elem => {
        if (elem.isConnected) return
        pending.delete(elem)
        deferred.delete(elem)
        intersectionObs.unobserve(elem)
      })
    },
    abandon () {
      disconnected = true
      const unseen = new Set(pending)
      intersectionObs.disconnect()
      pending.clear()
      deferred.clear()
      return unseen
    }
  }

  /* Re-observing an element forces a fresh initial notification, which re-evaluates visibility now that the tab is visible. */
  const onVisibilityChange = () => {
    if (globalScope.document.visibilityState === 'hidden') return
    deferred.forEach(elem => {
      intersectionObs.unobserve(elem)
      intersectionObs.observe(elem)
    })
    deferred.clear()
  }
  globalScope.document.addEventListener('visibilitychange', onVisibilityChange, { passive: true })

  if (!trackersById.has(target.id)) trackersById.set(target.id, [])
  trackersById.get(target.id).push(tracker)
  startSharedObserver()

  handle.disconnect = () => {
    if (disconnected) return
    globalScope.document.removeEventListener('visibilitychange', onVisibilityChange, { passive: true })
    const unseen = tracker.abandon()

    const remaining = trackersById.get(target.id).filter(t => t !== tracker)
    if (remaining.length) trackersById.set(target.id, remaining)
    else trackersById.delete(target.id)
    if (!trackersById.size) {
      sharedObserver?.disconnect()
      sharedObserver = undefined
    }

    /* Hand nodes this tracker claimed but never saw as visible to the next tracker for the same id, which already skipped
    them because they were claimed. Nodes it did count stay claimed, so they are never counted twice. */
    unseen.forEach(elem => {
      claimedNodes.delete(elem)
      if (elem.isConnected) remaining[0]?.claim(elem)
    })
  }

  // count anything that was rendered before tracking began
  globalScope.document.querySelectorAll(`[data-nr-mfe-id="${escapeSelectorValue(target.id)}"]`).forEach(dispatch)

  return handle
}
