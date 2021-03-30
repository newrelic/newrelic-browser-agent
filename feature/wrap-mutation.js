var ee = require('ee').get('mutation')
var wrapFn = require('../wrap-function')(ee)
var OriginalObserver = NREUM.o.MO

module.exports = ee

if (OriginalObserver) {
  window.MutationObserver = function WrappedMutationObserver (cb) {
    if (this instanceof OriginalObserver) {
      return new OriginalObserver(wrapFn(cb, 'fn-'))
    } else {
      return OriginalObserver.apply(this, arguments)
    }
  }

  MutationObserver.prototype = OriginalObserver.prototype
}
