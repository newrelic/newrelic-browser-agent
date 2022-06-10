/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// cdn specific utility files
import agentIdentifier from '../shared/agentIdentifier'
import { stageAggregator } from './utils/importAggregator'
// feature modules
import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/features/metrics/instrument'
import { configure } from './utils/configure'

// set up the NREUM, api, and internal configs
configure()

// instantiate auto-instrumentation specific to this loader...
new InstrumentPageViewEvent(agentIdentifier) // document load (page view event + metrics)
new InstrumentPageViewTiming(agentIdentifier) // page view timings instrumentation (/loader/timings.js)
new InstrumentMetrics(agentIdentifier) // supportability & custom metrics

// lazy-loads the aggregator features for 'lite' if no other aggregator takes precedence
stageAggregator('lite')

