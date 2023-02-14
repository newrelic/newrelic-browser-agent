let matcher = require('../../../tools/jil/util/browser-matcher')
let supportsMutationObserver = matcher.withFeature('mutation')
let supportsEventListenerWrapping = matcher.withFeature('wrappableAddEventListener')
module.exports = supportsMutationObserver.intersect(supportsEventListenerWrapping)
