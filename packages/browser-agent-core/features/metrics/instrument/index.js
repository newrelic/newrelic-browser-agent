import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { FeatureBase } from '../../../common/util/feature-base'
import { getFrameworks } from '../../../common/metrics/framework-detection'
import { protocol } from '../../../common/url/protocol'
import { getRules, validateRules } from '../../../common/util/obfuscate'
import { VERSION } from '../../../common/constants/environment-variables'
import { onDOMContentLoaded } from '../../../common/window/load'

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

export class Instrument extends FeatureBase {
    constructor(agentIdentifier) {
        super(agentIdentifier)
        // checks that are run only one time, at script load
        this.singleChecks()
        // listen for messages from features and capture them
        registerHandler('record-supportability', (...args) => this.recordSupportability(...args), undefined, this.ee)
        registerHandler('record-custom', (...args) => this.recordCustom(...args), undefined, this.ee)
    }

    /**
     * Records a supportabilityMetric (sm) using the value of a named property or as a counter without a value.
     * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
     * @param {number} [value] - The value of the metric, if none, will increment counter
     * @returns void
     */
    recordSupportability(name, value) {
        var opts = [
            SUPPORTABILITY_METRIC,
            name,
            { name: name },
            value
        ]
        handle('storeMetric', opts, null, undefined, this.ee)
        return opts
    }
    /**
     * Records a customMetric (cm) using the value of a named property or as a counter without a value.
     * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
     * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name. If none, will incrememnt counter
     * @returns void
     */
    recordCustom(name, metrics) {
        var opts = [
            CUSTOM_METRIC,
            name,
            { name: name },
            metrics
        ]

        handle('storeEventMetrics', opts, null, undefined, this.ee)
        return opts
    }

    singleChecks() {
        // note the browser agent version
        this.recordSupportability(`Generic/Version/${VERSION}/Detected`)

        // frameworks on page
        onDOMContentLoaded(() => {
            getFrameworks().forEach(framework => {
                this.recordSupportability('Framework/' + framework + '/Detected')
            })
        })

        // file protocol detection
        if (protocol.isFileProtocol()) {
            this.recordSupportability('Generic/FileProtocol/Detected')
            protocol.supportabilityMetricSent = true
        }

        // obfuscation rules detection
        const rules = getRules(this.agentIdentifier)
        if (rules.length > 0) this.recordSupportability('Generic/Obfuscate/Detected')
        if (rules.length > 0 && !validateRules(rules)) this.recordSupportability('Generic/Obfuscate/Invalid')
    }
}

export var constants = { SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC, CUSTOM_METRIC: CUSTOM_METRIC }
