/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// cdn specific utility files
import {setAPI} from './utils/api'
// common modules
import {gosCDN} from '../../modules/common/window/nreum'
import { protocolAllowed } from '../../modules/common/url/protocol-allowed'
import { onWindowLoad } from '../../modules/common/window/load'
// feature modules
import { instrumentPageView } from '../../modules/features/page-view-event/instrument'
import { instrumentPageViewTiming } from '../../modules/features/page-view-timing/instrument'
import {initialize as initializeErrors} from '../../modules/features/js-errors/instrument'
import {initialize as initializeXhr} from '../../modules/features/ajax/instrument'

// set up the window.NREUM object that is specifically for the CDN build
gosCDN()
// add api calls to the NREUM object
setAPI()

if (!protocolAllowed(window.location)) {
  // shut down the protocol if not allowed here...
}

// load auto-instrumentation here...
initializeErrors(true)
initializeXhr(true)
// session traces
// ins (apis)
instrumentPageView() // document load (page view event + metrics)
instrumentPageViewTiming() // page view timings instrumentation (/loader/timings.js)

// inject the aggregator
onWindowLoad(importAggregator)

let loadFired = 0
export async function importAggregator () {
    if (loadFired++) return
    await import('../agent-aggregator/pro')
}