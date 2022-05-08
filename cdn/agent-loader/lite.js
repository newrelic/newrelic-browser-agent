/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// cdn specific utility files
import {setAPI} from './utils/api'
// common modules
import { gosCDN } from '../../modules/common/window/nreum'
import { onWindowLoad } from '../../modules/common/window/load'
import { setConfiguration, setInfo, setLoaderConfig } from '../../modules/common/config/config'
// feature modules
import { initialize as instrumentPageViewEvent } from '../../modules/features/page-view-event/instrument'
import { initialize as instrumentPageViewTiming } from '../../modules/features/page-view-timing/instrument'

// set up the window.NREUM object that is specifically for the CDN build
const nr = gosCDN()

// set configuration from global NREUM.init (When building CDN specifically)
setInfo(nr.info)
setConfiguration(nr.init)
setLoaderConfig(nr.loader_config)

// add api calls to the NREUM object
setAPI()

// load auto-instrumentation here...
instrumentPageViewEvent() // document load (page view event + metrics)
instrumentPageViewTiming() // page view timings instrumentation (/loader/timings.js)

// inject the aggregator
onWindowLoad(importAggregator)

let loadFired = 0
export async function importAggregator () {
  if (loadFired++) return
  await import('../agent-aggregator/lite')
}
