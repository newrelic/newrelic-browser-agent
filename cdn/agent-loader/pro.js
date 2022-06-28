/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// cdn specific utility files
import agentIdentifier from '../shared/agentIdentifier'
import { stageAggregator } from './utils/importAggregator'
import { configure } from './utils/configure'
// feature modules
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/features/session-trace/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/features/page-action/instrument'
// common modules
import { getEnabledFeatures } from '@newrelic/browser-agent-core/common/util/enabled-features'
// 'pro' extends the instrumentation in lite loader, so load those features too
import './lite'

// set up the NREUM, api, and internal configs
configure().then(() => {

    const enabledFeatures = getEnabledFeatures(agentIdentifier)
    // instantiate auto-instrumentation specific to this loader...
    if (enabledFeatures.jserrors) new InstrumentErrors(agentIdentifier) // errors
    if (enabledFeatures.ajax) new InstrumentXhr(agentIdentifier) // ajax
    if (enabledFeatures['session_trace']) new InstrumentSessionTrace(agentIdentifier) // session traces
    if (enabledFeatures['page_action']) new InstrumentPageAction(agentIdentifier) // ins (apis)

    // imports the aggregator for 'lite' if no other aggregator takes precedence
    stageAggregator('pro')
})