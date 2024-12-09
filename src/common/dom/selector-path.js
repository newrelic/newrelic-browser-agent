/**
 * Generates a CSS selector path for the given element, if possible
 * @param {HTMLElement} elem
 * @param {boolean} includeId
 * @param {boolean} includeClass
 * @returns {string|undefined}
 */
export const generateSelectorPath = (elem, targetFields = []) => {
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

  const nearestFields = {}
  try {
    while (elem?.tagName) {
      const { id, localName } = elem
      targetFields.forEach(field => {
        nearestFields[nearestAttrName(field)] ||= elem[field]
      })
      const selector = [
        localName,
        id ? `#${id}` : '',
        pathSelector ? `>${pathSelector}` : ''
      ].join('')

      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  const path = pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
  return { path, nearestFields }

  function nearestAttrName (originalFieldName) {
    /** preserve original renaming structure for pre-existing field maps */
    if (originalFieldName === 'tagName') originalFieldName = 'tag'
    if (originalFieldName === 'className') originalFieldName = 'class'
    return `nearest${originalFieldName.charAt(0).toUpperCase() + originalFieldName.slice(1)}`
  }
}
