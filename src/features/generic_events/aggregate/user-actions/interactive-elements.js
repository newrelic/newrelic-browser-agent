/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
class InteractiveElements {
  constructor () {
    this.elements = new WeakMap()
  }

  add (target, listener) {
    if (!isInteractiveElement(target)) {
      return
    }
    if (!this.elements.has(target)) {
      this.elements.set(target, new Set())
    }
    this.elements.get(target).add(listener)
  }

  remove (target, listener) {
    if (this.elements.has(target)) {
      const handlers = this.elements.get(target)
      handlers.delete(listener)
      if (handlers.size === 0) {
        this.elements.delete(target)
      }
    }
  }

  has (target) {
    return this.elements.has(target)
  }

  get (target) {
    return this.elements.get(target)
  }
}

export const interactiveElems = new InteractiveElements()

function isInteractiveElement (target) {
  const tagName = (target && target.nodeType === 1 && target.tagName?.toLowerCase()) ?? ''
  return tagName !== '' &&
    (tagName === 'button' ||
      tagName === 'a' ||
      (tagName === 'input' && target.type === 'button'))
}
