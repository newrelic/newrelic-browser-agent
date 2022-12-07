import { handle } from '../../../common/event-emitter/handle'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { FeatureBase } from '../../../common/util/feature-base'
import { getFrameworks } from '../../../common/metrics/framework-detection'
import { protocol } from '../../../common/url/protocol'
import { getRules, validateRules } from '../../../common/util/obfuscate'
import { VERSION } from '../../../common/constants/environment-variables'
import { onDOMContentLoaded } from '../../../common/window/load'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { isBrowserWindow } from '../../../common/window/win'
import { insertSupportMetrics } from './workers-helper'

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

export class Instrument extends FeatureBase {
    constructor(agentIdentifier, PfFeatStatusEnum = {}) {
        super(agentIdentifier)
        this.PfFeatStatusEnum = PfFeatStatusEnum

        this.singleChecks() // checks that are run only one time, at script load
        this.eachSessionChecks()    // the start of every time user engages with page
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
        if(isBrowserWindow) onDOMContentLoaded(() => {
            getFrameworks().forEach(framework => {
                this.recordSupportability('Framework/' + framework + '/Detected')
            })
        });

        // file protocol detection
        if (protocol.isFileProtocol()) {
            this.recordSupportability('Generic/FileProtocol/Detected')
            protocol.supportabilityMetricSent = true
        }

        // obfuscation rules detection
        const rules = getRules(this.agentIdentifier)
        if (rules.length > 0) this.recordSupportability('Generic/Obfuscate/Detected')
        if (rules.length > 0 && !validateRules(rules)) this.recordSupportability('Generic/Obfuscate/Invalid')

        // polyfilled feature detection
        if (isBrowserWindow) this.reportPolyfillsNeeded();

        // poll web worker support
        insertSupportMetrics(this.recordSupportability.bind(this));
    }

    reportPolyfillsNeeded() {
        this.recordSupportability(`Generic/Polyfill/Promise/${this.PfFeatStatusEnum.PROMISE}`);
        this.recordSupportability(`Generic/Polyfill/ArrayIncludes/${this.PfFeatStatusEnum.ARRAY_INCLUDES}`);
        this.recordSupportability(`Generic/Polyfill/ObjectAssign/${this.PfFeatStatusEnum.OBJECT_ASSIGN}`);
        this.recordSupportability(`Generic/Polyfill/ObjectEntries/${this.PfFeatStatusEnum.OBJECT_ENTRIES}`);
    }

    eachSessionChecks() {
        if (!isBrowserWindow) return;
        
        // [Temporary] Report restores from BFCache to NR1 while feature flag is in place in lieu of sending pageshow events.
        windowAddEventListener('pageshow', (evt) => {
            if (evt.persisted)
                this.recordCustom('Custom/BFCache/PageRestored');
            return;
        });
    }
}

export var constants = { SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC, CUSTOM_METRIC: CUSTOM_METRIC }
