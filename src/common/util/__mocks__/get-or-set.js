export const getOrSet = jest.fn((obj, prop, getVal) => {
  if (obj[prop]) return obj[prop]
  obj[prop] = getVal()
  return obj[prop]
})
