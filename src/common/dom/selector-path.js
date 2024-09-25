/**
 * Generates a CSS selector path for the given element, if possible
 * @param {HTMLElement} elem
 * @param {boolean} includeId
 * @param {boolean} includeClass
 * @returns {string|undefined}
 */
export const generateSelectorPath = (elem, { includeId, includeClass }) => {
  if (!elem) return

  const getIndex = (node) => {
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
  let index = getIndex(elem)

  try {
    while (elem?.tagName) {
      const { className, id, localName } = elem
      const selector = [
        localName,
        includeClass && className ? `.${className}` : '',
        includeId && id ? `#${id}` : '',
        pathSelector ? `>${pathSelector}` : ''
      ].join('')

      pathSelector = selector
      elem = elem.parentNode
    }
  } catch (err) {
  // do nothing for now
  }

  return pathSelector ? index ? `${pathSelector}:nth-of-type(${index})` : pathSelector : undefined
}
