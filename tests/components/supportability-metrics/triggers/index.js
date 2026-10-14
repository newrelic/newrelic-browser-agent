/** Every trigger module is merged here, keyed by the registry entry's tag. */
module.exports = {
  ...require('./mechanical'),
  ...require('./ajax-session'),
  ...require('./session-replay'),
  ...require('./harvest'),
  ...require('./network'),
  ...require('./generic')
}
