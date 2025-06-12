/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
class InteractiveElements extends WeakMap {
  add (target, listener) {
    if (!isInteractiveElement(target)) {
      return
    }
    if (!super.has(target)) {
      super.set(target, new Set())
    }
    super.get(target).add(listener)
  }

  delete (target, listener) {
    if (super.has(target)) {
      const handlers = super.get(target)
      handlers.delete(listener)
      if (handlers.size === 0) {
        super.delete(target)
      }
    }
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
