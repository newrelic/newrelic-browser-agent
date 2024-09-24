export const generateSelectorPath = (context) => {
  if (!context) return

  const getIndex = (node) => {
    let i = 1
    const { tagName } = node
    while (node.previousElementSibling) {
      if (node.previousElementSibling.tagName === tagName) i++
      node = node.previousElementSibling
    }
    return i
  }

  let pathSelector = ''
  let index = getIndex(context)

  while (context?.tagName) {
    const { className, id, localName } = context
    const selector = [
      localName,
      className ? `.${className}` : '',
      id ? `#${id}` : '',
      pathSelector ? `>${pathSelector}` : ''
    ].join('')

    pathSelector = selector
    context = context.parentNode
  }

  return pathSelector ? `${pathSelector}:nth-of-type(${index})` : undefined
}
