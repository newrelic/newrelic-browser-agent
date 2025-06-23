/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { interactiveElems } from '../../features/generic_events/aggregate/user-actions/interactive-elements'

/**
 * Generates a CSS selector path for the given element, if possible
 * Also gather metadata about the element's nearest fields, and whether there are any interactive links in the path.
 * @param {HTMLElement} elem
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {{path: (undefined|string), nearestFields: {}, hasInteractiveElems: boolean, hasLink: boolean, hasTextbox: boolean}}
 */
export const analyzeElemPath = (elem, targetFields = []) => {
  const result = { path: undefined, nearestFields: {}, hasInteractiveElems: false, hasLink: false, hasTextbox: false }
  if (!elem) return result

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

      result.hasLink ||= elem.tagName.toLowerCase() === 'a'
      result.hasTextbox ||= elem.tagName.toLowerCase() === 'input' && elem.type.toLowerCase() === 'text'

      result.hasInteractiveElems ||= isInteractiveLink(elem) || isInteractiveTextbox(elem)
      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  const path = pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
  return { ...result, path, nearestFields }

  function nearestAttrName (originalFieldName) {
    /** preserve original renaming structure for pre-existing field maps */
    if (originalFieldName === 'tagName') originalFieldName = 'tag'
    if (originalFieldName === 'className') originalFieldName = 'class'
    return `nearest${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
  }

  /**
   * Checks if the element is an interactive link.
   * A link is considered interactive if it is visible and has an `href` attribute, an `onclick` handler, or any click event listener(s).
   * @param {HTMLElement} elem
   * @returns {boolean} true only if the element is an interactive link
   */
  function isInteractiveLink (elem) {
    return elem.tagName.toLowerCase() === 'a' &&
      (interactiveElems.has(elem) || typeof elem.onclick === 'function' || elem.hasAttribute('href'))
  }

  /**
   * Checks if the element is an interactive textbox.
   * A textbox is considered interactive if it is visible and is not read-only.
   * @param {HTMLElement} elem
   * @returns {boolean} true only if the element is an interactive textbox
   */
  function isInteractiveTextbox (elem) {
    return elem.tagName.toLowerCase() === 'input' && elem.type.toLowerCase() === 'text' && !elem.readOnly
  }
}
