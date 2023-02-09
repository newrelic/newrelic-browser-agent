let BrowserMatcher = require('jil/util/browser-matcher')
let blobSupported = BrowserMatcher.withFeature('blob')
module.exports = blobSupported
