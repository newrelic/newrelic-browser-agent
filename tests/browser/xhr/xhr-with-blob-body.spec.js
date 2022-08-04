let BrowserMatcher = require('jil/util/browser-matcher')
let xhrSupported = BrowserMatcher.withFeature('xhr')
let blobSupported = BrowserMatcher.withFeature('blob')
module.exports = xhrSupported.intersect(blobSupported)