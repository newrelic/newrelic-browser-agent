/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// cdn specific utility files
import {setAPI} from './utils/api'
// common modules
import { gosCDN, defaults as defInfo } from '../../modules/common/window/nreum'
import { protocolAllowed } from '../../modules/common/url/protocol-allowed'
import { onWindowLoad } from '../../modules/common/window/load'
import { mapOwn } from '../../modules/common/util/map-own'
import { setConfiguration, setInfo, setLoaderConfig } from '../../modules/common/config/config'
// feature modules
import { instrumentPageView } from '../../modules/features/page-view-event/instrument'
import { instrumentPageViewTiming } from '../../modules/features/page-view-timing/instrument'

// set up the window.NREUM object that is specifically for the CDN build
const nr = gosCDN()
  
if (!(nr.info && nr.info.licenseKey && nr.info.applicationID)) {
    ee.abort()
}

// set configuration from global NREUM.init (When building CDN specifically)
setInfo(nr.info)
setConfiguration(nr.init)
setLoaderConfig(nr.loaderConfig)

// add api calls to the NREUM object
setAPI()

if (!protocolAllowed(window.location)) { //file: protocol
  // shut down the protocol if not allowed here...
}

// load auto-instrumentation here...
instrumentPageView() // document load (page view event + metrics)
instrumentPageViewTiming() // page view timings instrumentation (/loader/timings.js)

// inject the aggregator
onWindowLoad(importAggregator)

let loadFired = 0
export async function importAggregator () {
    if (loadFired++) return
    await import('../agent-aggregator/lite')
}