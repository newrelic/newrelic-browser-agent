import { BrowserAgent } from "@newrelic/browser-agent-custom";

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page_view_timing/instrument'

new BrowserAgent({
    features: [
        InstrumentPageViewEvent,
        InstrumentPageViewTiming
    ]
})
