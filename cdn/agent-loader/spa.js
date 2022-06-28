/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* cdn specific utility files */
import { stageAggregator } from './utils/importAggregator'
import agentIdentifier from '../shared/agentIdentifier'
/* feature modules */
import { Instrument as InstrumentSpa } from '@newrelic/browser-agent-core/features/spa/instrument'
// common modules
import { getEnabledFeatures } from '@newrelic/browser-agent-core/common/util/enabled-features'
/* 'spa' extends the instrumentation in lite and pro loaders, so load those features too */
import './lite'
import './pro'
import { configure } from './utils/configure'

// set up the NREUM, api, and internal configs
configure().then(() => {
    const enabledFeatures = getEnabledFeatures(agentIdentifier)
    // instantiate auto-instrumentation specific to this loader...
    if (enabledFeatures.spa) new InstrumentSpa(agentIdentifier) // spa

    // imports the aggregator for 'lite' if no other aggregator takes precedence
    stageAggregator('spa')
})