/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { interactiveElems } from './interactive-elements'

export function isInteractiveElement (elem) {
  const tagName = elem?.nodeType === Node.ELEMENT_NODE ? elem.tagName?.toLowerCase() : ''
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
  return tagName === 'input' && elem.type?.toLowerCase() === 'text' && !elem.readOnly
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
  return (tagName === 'button' || (tagName === 'input' && elem.type?.toLowerCase() === 'button')) &&
    (interactiveElems.has(elem) || typeof elem.onclick === 'function' || isPartOfForm(elem) || willUpdatePopover(elem))
}

function isPartOfForm (buttonElem) {
  // specified form attribute overrides any ancestor forms
  const formAttr = buttonElem.attributes?.form
  return formAttr ? buttonElem.form !== null : buttonElem.closest('form') !== null
}

function willUpdatePopover (buttonElem) {
  const maybePopover = buttonElem.popoverTargetElement
  if (maybePopover?.nodeType === Node.ELEMENT_NODE) {
    const display = getComputedStyle(maybePopover).display
    const action = buttonElem.popoverTargetAction
    return (action !== 'hide' && action !== 'show') ||
      (action === 'hide' && display === 'block') ||
      (action === 'show' && display === 'none')
  }

  return false
}
