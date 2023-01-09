/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// cdn specific utility files
import agentIdentifier from '../shared/agentIdentifier'
import { stageAggregator } from './utils/importAggregator'
import { configure } from './utils/configure'
// feature modules
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/src/features/page-action/instrument'
// common modules
import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/common/util/enabled-features'
import globalScope from '@newrelic/browser-agent-core/src/common/util/global-scope'

// set up the NREUM, api, and internal configs
try {
    configure()
    const enabledFeatures = getEnabledFeatures(agentIdentifier)
    if (enabledFeatures.metrics) new InstrumentMetrics(agentIdentifier)   // supportability & custom metrics
    if (enabledFeatures.jserrors) new InstrumentErrors(agentIdentifier) // errors
    if (enabledFeatures.ajax) new InstrumentXhr(agentIdentifier) // ajax
    if (enabledFeatures['page_action']) new InstrumentPageAction(agentIdentifier) // ins (apis)
    // imports the aggregator for 'lite' if no other aggregator takes precedence
    stageAggregator('worker')
} catch (err) {
    if (globalScope?.newrelic?.ee?.abort) globalScope.newrelic.ee.abort()
    // todo
    // send supportability metric that the agent failed to load its features
}

