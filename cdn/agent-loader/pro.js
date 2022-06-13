/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// cdn specific utility files
import agentIdentifier from '../shared/agentIdentifier'
import { stageAggregator } from './utils/importAggregator'
import { configure } from './utils/configure'
// feature modules
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/features/js-errors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/features/session-trace/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/features/page-action/instrument'
// 'pro' extends the instrumentation in lite loader, so load those features too
import './lite'

// set up the NREUM, api, and internal configs
configure()

// instantiate auto-instrumentation specific to this loader...
new InstrumentErrors(agentIdentifier) // errors
new InstrumentXhr(agentIdentifier) // ajax
new InstrumentSessionTrace(agentIdentifier) // session traces
new InstrumentPageAction(agentIdentifier) // ins (apis)

// imports the aggregator for 'lite' if no other aggregator takes precedence
stageAggregator('pro')
