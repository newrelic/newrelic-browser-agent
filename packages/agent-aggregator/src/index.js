var core = require('nr-browser-core')
var errorsAggregator = require('nr-browser-err-aggregate')

core.setConfiguration('jserrors.harvestTimeSeconds', 5)
core.init(Object.assign({}, NREUM.info))

errorsAggregator.initialize(true)

// core.recordError(new Error('some error'))
