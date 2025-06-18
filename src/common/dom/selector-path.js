/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { interactiveElems } from '../../features/generic_events/aggregate/user-actions/interactive-elements'
import { warn } from '../util/console'
import { isVisible } from '../../features/generic_events/aggregate/user-actions/utils'

/**
 * Generates a CSS selector path for the given element, if possible
 * Also gather metadata about the element's nearest fields, and whether there are any interactive links in the path.
 * @param {HTMLElement} elem
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {{path: undefined, nearestFields: {}}|{path: (string|string), nearestFields: {}, hasActLink: boolean}}
 */
export const analyzeElemPath = (elem, targetFields = []) => {
  if (!elem) return { path: undefined, nearestFields: {} }

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
  let hasActLink

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

      if (hasActLink === undefined) {
        hasActLink = isInteractiveLink(elem)
      }

      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  const path = pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
  return { path, nearestFields, hasActLink }

  function nearestAttrName (originalFieldName) {
    /** preserve original renaming structure for pre-existing field maps */
    if (originalFieldName === 'tagName') originalFieldName = 'tag'
    if (originalFieldName === 'className') originalFieldName = 'class'
    return `nearest${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
  }

  /**
   * Checks if the element is an interactive link. Elements that are not visible will not be checked for interactivity.
   * A link is considered interactive if it has an `href` attribute, an `onclick` handler, or any click event listener(s).
   * @param elem
   * @returns {boolean|undefined} undefined if not a visible link, false if the link is not interactive, true if it is interactive.
   */
  function isInteractiveLink (elem) {
    try {
      if (!elem ||
        elem.nodeType !== Node.ELEMENT_NODE ||
        elem.tagName?.toLowerCase() !== 'a' ||
        !isVisible(elem)) return undefined
      return typeof elem.onclick === 'function' || interactiveElems.has(elem) || elem.hasAttribute('href')
    } catch (err) {
      warn(63, {
        element: elem?.tagName,
        error: err.message
      })
    }
    return undefined
  }
}
