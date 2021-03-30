module.exports = protocolAllowed

function protocolAllowed (location) {
  return !!(location && location.protocol && location.protocol !== 'file:')
}
