var handleEE = require('handle').ee

module.exports = defaultRegister

defaultRegister.on = registerWithSpecificEmitter

var handlers = defaultRegister.handlers = {}

function defaultRegister (type, handler, group, ee) {
  registerWithSpecificEmitter(ee || handleEE, type, handler, group)
}

function registerWithSpecificEmitter (ee, type, handler, group) {
  if (!group) group = 'feature'
  if (!ee) ee = handleEE
  var groupHandlers = handlers[group] = handlers[group] || {}
  var list = groupHandlers[type] = groupHandlers[type] || []
  list.push([ee, handler])
}
