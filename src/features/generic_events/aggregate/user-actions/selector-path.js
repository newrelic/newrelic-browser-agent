/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isInteractiveElement } from './interactive-elements'

/**
 * @typedef {object} SelectorInfo Metadata about the selector path and nearest fields of an element
 * @property {string|undefined} path The CSS selector path for the element, or undefined if no path could be generated
 * @property {object} nearestFields A lookup of target fields and their values from the nearest element in the path
 * @property {boolean} hasInteractiveElems Whether the path contains any interactive elements (link, textbox, or button)
 * @property {boolean} hasButton Whether the path contains any buttons
 * @property {boolean} hasLink Whether the path contains any links
 * @property {boolean} hasTextbox Whether the path contains any textboxes
 */

/**
 * Generates a CSS selector path for the given element, if possible
 * Also gather metadata about the element's nearest fields, and whether there are any interactive elements (link, textbox, or button) in the path.
 * @param {HTMLElement} elem
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {SelectorInfo} selector path + other metadata about the selector path
 */
export const analyzeElemPath = (elem, targetFields = []) => {
  const result = { path: undefined, nearestFields: {}, hasInteractiveElems: false, hasButton: false, hasLink: false, hasTextbox: false }
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

      const tagName = elem.tagName.toLowerCase()
      result.hasLink ||= tagName === 'a'
      result.hasTextbox ||= tagName === 'input' && elem.type.toLowerCase() === 'text'
      result.hasButton ||= tagName === 'button' || (tagName === 'input' && elem.type.toLowerCase() === 'button')

      // Evaluation of buttons used for commands is not yet supported and will be ignored for dead click detection
      if (tagName === 'button') {
        result.ignoreDeadClick ||= Object.values(elem.attributes).some(x => x.nodeName === 'command')
      }

      result.hasInteractiveElems ||= isInteractiveElement(elem)
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
}
