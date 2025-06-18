/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { interactiveElems } from '../../features/generic_events/aggregate/user-actions/interactive-elements'
import { isVisible } from '../../features/generic_events/aggregate/user-actions/utils'

/**
 * Generates a CSS selector path for the given element, if possible
 * Also gather metadata about the element's nearest fields, and whether there are any interactive links in the path.
 * @param {HTMLElement} elem
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {{path: (undefined|string), nearestFields: {}, hasInteractiveElems: boolean, hasVisibleLink: boolean, hasVisibleTextbox: boolean}}
 */
export const analyzeElemPath = (elem, targetFields = []) => {
  if (!elem) return { path: undefined, nearestFields: {}, hasInteractiveElems: false, hasVisibleLink: false, hasVisibleTextbox: false }

  const getNthOfTypeIndex = (node) => {
    try {
      let i = 1
      const { tagName } = node
      while (node.previousElementSibling) {
        if (node.previousElementSibling.tagName === tagName) i++
        node = node.previousElementSibling
      }
      return i
    } catch (err) {
    // do nothing for now.  An invalid child count will make the path selector not return a nth-of-type selector statement
    }
  }

  let pathSelector = ''
  let index = getNthOfTypeIndex(elem)
  let visible = false
  let hasVisibleLink = false
  let hasVisibleTextbox = false
  let hasInteractiveElems = false

  const nearestFields = {}
  try {
    while (elem?.tagName) {
      const { id, localName } = elem
      targetFields.forEach(field => { nearestFields[nearestAttrName(field)] ||= (elem[field]?.baseVal || elem[field]) })
      const selector = [
        localName,
        id ? `#${id}` : '',
        pathSelector ? `>${pathSelector}` : ''
      ].join('')

      visible = isVisibleElem(elem)
      hasVisibleLink ||= visible && elem.tagName.toLowerCase() === 'a'
      hasVisibleTextbox ||= visible && elem.tagName.toLowerCase() === 'input' && elem.type.toLowerCase() === 'text'

      hasInteractiveElems ||= isInteractiveLink(elem, visible) || isInteractiveTextbox(elem, visible)
      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  const path = pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
  return { path, nearestFields, hasInteractiveElems, hasVisibleLink, hasVisibleTextbox }

  function nearestAttrName (originalFieldName) {
    /** preserve original renaming structure for pre-existing field maps */
    if (originalFieldName === 'tagName') originalFieldName = 'tag'
    if (originalFieldName === 'className') originalFieldName = 'class'
    return `nearest${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
  }

  function isVisibleElem (elem) {
    return elem &&
      elem.nodeType === Node.ELEMENT_NODE &&
      isVisible(elem)
  }

  /**
   * Checks if the element is an interactive link.
   * A link is considered interactive if it is visible and has an `href` attribute, an `onclick` handler, or any click event listener(s).
   * @param {HTMLElement} elem
   * @param {boolean} visible
   * @returns {boolean} true only if the element is an interactive link
   */
  function isInteractiveLink (elem, visible) {
    return visible && elem.tagName.toLowerCase() === 'a' &&
      (interactiveElems.has(elem) || typeof elem.onclick === 'function' || elem.hasAttribute('href'))
  }

  /**
   * Checks if the element is an interactive textbox.
   * A textbox is considered interactive if it is visible and is not read-only.
   * @param {HTMLElement} elem
   * @param {boolean} visible
   * @returns {boolean} true only if the element is an interactive textbox
   */
  function isInteractiveTextbox (elem, visible) {
    return visible && elem.tagName.toLowerCase() === 'input' && elem.type.toLowerCase() === 'text' && !elem.readOnly
  }
}
