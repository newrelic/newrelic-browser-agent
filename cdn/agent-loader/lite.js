/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// polyfills
import 'core-js/actual/promise'
import 'core-js/actual/array/includes'
import 'core-js/actual/object/assign'
import 'core-js/actual/object/entries'
// cdn specific utility files
import agentIdentifier from '../shared/agentIdentifier'
import { stageAggregator } from './utils/importAggregator'
import { configure } from './utils/configure'
// feature modules
import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/features/metrics/instrument'
// common modules
import { getEnabledFeatures } from '@newrelic/browser-agent-core/common/util/enabled-features'

// set up the NREUM, api, and internal configs
configure().then(() => {
    const enabledFeatures = getEnabledFeatures(agentIdentifier)
    // instantiate auto-instrumentation specific to this loader...
    if (enabledFeatures['page_view_event']) new InstrumentPageViewEvent(agentIdentifier) // document load (page view event + metrics)
    if (enabledFeatures['page_view_timing']) new InstrumentPageViewTiming(agentIdentifier) // page view timings instrumentation (/loader/timings.js)
    if (enabledFeatures.metrics) new InstrumentMetrics(agentIdentifier) // supportability & custom metrics

    // lazy-loads the aggregator features for 'lite' if no other aggregator takes precedence
    stageAggregator('lite')
})
