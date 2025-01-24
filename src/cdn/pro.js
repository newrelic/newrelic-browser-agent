/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Creates a "Pro" agent loader bundle composed of the core Agent and all available feature modules except `spa`.
 * This excludes collection of BrowserInteraction and BrowserTiming events.
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
import { Instrument as InstrumentLogs } from '../features/logging/instrument'

new Agent({
  features: [
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentSessionReplay,
    InstrumentXhr,
    InstrumentMetrics,
    InstrumentErrors,
    InstrumentGenericEvents,
    InstrumentLogs
  ],
  loaderType: 'pro'
})
