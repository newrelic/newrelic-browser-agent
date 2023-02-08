let matcher = require('jil/util/browser-matcher');
let supported = matcher.withFeature('cors').inverse();

module.exports = supported;
