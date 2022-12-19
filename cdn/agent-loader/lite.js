import {BrowserAgent} from "@newrelic/browser-agent/src/custom-loader";

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page-view-timing/instrument'

const agent = new BrowserAgent({
    topLevelConfigs: true, 
    features: [
        InstrumentPageViewEvent,
        InstrumentPageViewTiming
    ]
})
