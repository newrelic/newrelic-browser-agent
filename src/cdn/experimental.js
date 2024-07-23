/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Creates an "EXPERIMENTAL" agent loader bundle composed of the core agent and all available feature modules, including experimental features.
 *
 * NOTE: This loader is ONLY used for internal testing. The code contained within is likely under development and dormant. It will not download to instrumented pages or record any data.
 * It is not production ready, and is not intended to be imported or implemented in any build of the browser agent
 */
import { Agent } from '../loaders/agent'

import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentSessionReplay } from '../features/session_replay/instrument'
import { Instrument as InstrumentGenericEvents } from '../features/generic_events/instrument'
// import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentSoftNav } from '../features/soft_navigations/instrument'
import { Instrument as InstrumentLogs } from '../features/logging/instrument'

new Agent({
  features: [
    InstrumentXhr,
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentSessionReplay,
    InstrumentMetrics,
    InstrumentErrors,
    InstrumentGenericEvents,
    InstrumentLogs,
    // InstrumentSpa,
    InstrumentSoftNav
  ],
  loaderType: 'experimental'
})
