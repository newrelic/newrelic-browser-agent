/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { detectPolyfillFeatures } from './utils/feature-detection'
const PolyfillFeatures = detectPolyfillFeatures();
/* cdn specific utility files */
import { stageAggregator } from './utils/importAggregator'
import agentIdentifier from '../shared/agentIdentifier'
/* feature modules */
import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/src/features/session-trace/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/src/features/page-action/instrument'
import { Instrument as InstrumentSpa } from '@newrelic/browser-agent-core/src/features/spa/instrument'
// common modules
import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/common/util/enabled-features'
import { configure } from './utils/configure'
import globalScope from '@newrelic/browser-agent-core/src/common/util/global-scope'

// set up the NREUM, api, and internal configs
try {
    configure()
    const enabledFeatures = getEnabledFeatures(agentIdentifier)
    // lite features
    if (enabledFeatures['page_view_event']) new InstrumentPageViewEvent(agentIdentifier) // document load (page view event + metrics)
    if (enabledFeatures['page_view_timing']) new InstrumentPageViewTiming(agentIdentifier) // page view timings instrumentation (/loader/timings.js)
    if (enabledFeatures.metrics) new InstrumentMetrics(agentIdentifier, PolyfillFeatures)   // supportability & custom metrics
    // pro features
    if (enabledFeatures.jserrors) new InstrumentErrors(agentIdentifier) // errors
    if (enabledFeatures.ajax) new InstrumentXhr(agentIdentifier) // ajax
    if (enabledFeatures['session_trace']) new InstrumentSessionTrace(agentIdentifier) // session traces
    if (enabledFeatures['page_action']) new InstrumentPageAction(agentIdentifier) // ins (apis)
    // instantiate auto-instrumentation specific to this loader...
    if (enabledFeatures.spa) new InstrumentSpa(agentIdentifier) // spa

    // imports the aggregator for 'lite' if no other aggregator takes precedence
    stageAggregator('spa')
} catch (err) {
    if (globalScope?.newrelic?.ee?.abort) globalScope.newrelic.ee.abort()
    // todo
    // send supportability metric that the agent failed to load its features
}
