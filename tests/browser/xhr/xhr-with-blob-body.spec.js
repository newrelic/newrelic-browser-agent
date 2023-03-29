let BrowserMatcher = require('../../../tools/jil/util/browser-matcher')
let blobSupported = BrowserMatcher.withFeature('blob')
module.exports = blobSupported
