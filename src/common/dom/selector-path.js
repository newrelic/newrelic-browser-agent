/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a CSS selector path for the given element, if possible
 * Also gather metadata about the element's nearest fields, and whether there are any links or buttons in the path.
 * @param {HTMLElement} elem
 * @param {Array<string>} [targetFields=[]] specifies which fields to gather from the nearest element in the path
 * @returns {{path: (undefined|string), nearestFields: {}, hasButton: boolean, hasLink: boolean}}
 */
export const analyzeElemPath = (elem, targetFields = []) => {
  const result = { path: undefined, nearestFields: {}, hasButton: false, hasLink: false }
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

  try {
    while (elem?.tagName) {
      const { id, localName } = elem
      targetFields.forEach(field => { result.nearestFields[nearestAttrName(field)] ||= (elem[field]?.baseVal || elem[field]) })
      const selector = [
        localName,
        id ? `#${id}` : '',
        pathSelector ? `>${pathSelector}` : ''
      ].join('')

      const tagName = elem.tagName.toLowerCase()
      result.hasLink ||= tagName === 'a'
      result.hasButton ||= tagName === 'button' || (tagName === 'input' && elem.type.toLowerCase() === 'button')

      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  result.path = pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
  return result

  function nearestAttrName (originalFieldName) {
    /** preserve original renaming structure for pre-existing field maps */
    if (originalFieldName === 'tagName') originalFieldName = 'tag'
    if (originalFieldName === 'className') originalFieldName = 'class'
    return `nearest${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
  }
}
