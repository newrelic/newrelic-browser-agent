/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// this must be imported first right now in CDN builds... it sets up and relies on the NREUM window object
import {setAPI} from './utils/api'
import { injectAggregator } from './utils/inject-aggregator'
import {gosCDN} from '../../modules/common/window/nreum'
import { protocolAllowed } from '../../modules/common/url/protocol-allowed'
import { listenForLoad } from '../../modules/features/document-load/instrument'

// set up the window.NREUM object that is specifically for the CDN build
gosCDN()
// add api calls to the NREUM object
setAPI()

if (!protocolAllowed(window.location)) {
  // shut down the protocol if not allowed here...
}

// load auto-instrumentation here...
// (lite doesn't do any)

// inject aggregator when window loads...
listenForLoad(injectAggregator)