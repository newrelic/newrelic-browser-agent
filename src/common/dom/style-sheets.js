/**
 *
 * @param {Element} ownerNode - The stylesheet node that will be cloned and removed from the DOM
 * @returns {Promise} A promise that resolves successfully once the cloned element has been injected and the onload event has fired
 */
export function reinjectStylesheetAsAnonymous (ownerNode) {
  const newStyle = ownerNode.cloneNode(true)
  return new Promise((resolve) => {
    newStyle.crossOrigin = 'anonymous'
    newStyle.onload = () => { resolve() }
    ownerNode.replaceWith(newStyle)
  })
}
