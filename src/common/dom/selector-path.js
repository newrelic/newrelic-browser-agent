export function generateSelectorPath (context) {
  let index, pathSelector

  if (context === null) return
  // call getIndex function
  index = getIndex(context)

  while (context?.tagName) {
    // selector path
    const className = context.className
    const idName = context.id

    pathSelector = context.localName +
        (className ? `.${className}` : '') +
        (idName ? `#${idName}` : '') +
        (pathSelector ? '>' + pathSelector : '')

    context = context.parentNode
  }
  // if the event happened on the window or other non-DOM element, just return undefined
  if (!pathSelector) return
  // selector path for nth of type
  pathSelector = pathSelector + `:nth-of-type(${index})`
  return pathSelector
}

// get index for nth of type element
function getIndex (node) {
  let i = 1
  let tagName = node.tagName

  while (node.previousSibling) {
    node = node.previousSibling
    if (
      node.nodeType === 1 &&
            tagName.toLowerCase() === node.tagName.toLowerCase()
    ) {
      i++
    }
  }
  return i
}
