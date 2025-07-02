/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
class InteractiveElements extends WeakMap {
  add (target, listener) {
    if (!isButtonOrLink(target)) {
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

function isButtonOrLink (target) {
  const tagName = (target && target.nodeType === Node.ELEMENT_NODE && target.tagName?.toLowerCase()) ?? ''
  return tagName !== '' &&
    (tagName === 'button' ||
      tagName === 'a' ||
      (tagName === 'input' && target.type === 'button'))
}

export function isInteractiveElement (elem) {
  const tagName = (elem && elem.nodeType === Node.ELEMENT_NODE && elem.tagName?.toLowerCase()) ?? ''
  return isInteractiveLink(elem, tagName) || isInteractiveButton(elem, tagName) || isInteractiveTextbox(elem, tagName)
}

/**
 * Checks if the element is an interactive link.
 * A link is considered interactive if it has an `href` attribute, an `onclick` handler, or any click event listener(s).
 * @param {HTMLElement} elem
 * @param {tagName} string
 * @returns {boolean} true only if the element is an interactive link
 */
function isInteractiveLink (elem, tagName) {
  return tagName === 'a' &&
    (elem.hasAttribute('href') || interactiveElems.has(elem) || typeof elem.onclick === 'function')
}

/**
 * Checks if the element is an interactive textbox.
 * A textbox is considered interactive if it is not read-only.
 * @param {HTMLElement} elem
 * @param {tagName} string
 * @returns {boolean} true only if the element is an interactive textbox
 */
function isInteractiveTextbox (elem, tagName) {
  return tagName === 'input' && elem.type.toLowerCase() === 'text' && !elem.readOnly
}

/**
 * Checks if the element is an interactive button.
 * A link is considered interactive if
 * - it is part of a form or popover,
 * - has an `onclick` handler, or
 * - has any click event listener(s)
 *
 * @param {HTMLElement} elem
 * @param {tagName} string
 * @returns {boolean} true only if the element is an interactive button
 */
function isInteractiveButton (elem, tagName) {
  return (tagName === 'button' || (tagName === 'input' && elem.type.toLowerCase() === 'button')) &&
    (interactiveElems.has(elem) || typeof elem.onclick === 'function' || isPartOfForm(elem) || willUpdatePopover(elem))
}

function isPartOfForm (buttonElem) {
  // specified form attribute overrides any ancestor forms
  if (Object.values(buttonElem.attributes).filter(x => x.nodeName === 'form').length > 0) {
    return buttonElem.form !== null
  }
  return buttonElem.closest('form') !== null
}

function willUpdatePopover (buttonElem) {
  const maybePopover = buttonElem.popoverTargetElement
  if (maybePopover?.nodeType === Node.ELEMENT_NODE) {
    const targetDisplay = getComputedStyle(maybePopover).display
    return (buttonElem.popoverTargetAction !== 'hide' && buttonElem.popoverTargetAction !== 'show') ||
      (buttonElem.popoverTargetAction === 'hide' && targetDisplay === 'block') ||
      (buttonElem.popoverTargetAction === 'show' && targetDisplay === 'none')
  }

  return false
}
