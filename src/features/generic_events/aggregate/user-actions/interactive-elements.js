/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
class InteractiveElements extends WeakMap {
  add (target, listener) {
    if (isButtonOrLink(target)) {
      const handlers = super.get(target) || new Set()
      handlers.add(listener)
      super.set(target, handlers)
    }
  }

  delete (target, listener) {
    const handlers = super.get(target)
    if (handlers) {
      handlers.delete(listener)
      if (handlers.size === 0) super.delete(target)
    }
  }
}

export const interactiveElems = new InteractiveElements()

function isButtonOrLink (target) {
  const tagName = target?.tagName?.toLowerCase()
  return tagName === 'button' || tagName === 'a' || (tagName === 'input' && target.type === 'button')
}
