export const isValidSelector = (selector) => {
  if (!selector || typeof selector !== 'string') return false
  try {
    document.createDocumentFragment().querySelector(selector)
  } catch {
    return false
  }
  return true
}
