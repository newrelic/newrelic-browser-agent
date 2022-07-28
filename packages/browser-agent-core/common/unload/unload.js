/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ffVersion } from '../browser-version/firefox-version'
import {single} from '../util/single'
import {addE} from '../event-listener/add-e'

// Used to subscribe a callback to when a page is being unloaded. This is used,
// for example, to submit a final harvest.
export function subscribeToUnload (cb) {
  var oneCall = single(cb)

  // Firefox has a bug wherein a slow-loading resource loaded from the 'pagehide'
  // or 'unload' event will delay the 'load' event firing on the next page load.
  // In Firefox versions that support sendBeacon, this doesn't matter, because
  // we'll use it instead of an image load for our final harvest.
  //
  // Some Safari versions never fire the 'unload' event for pages that are being
  // put into the WebKit page cache, so we *need* to use the pagehide event for
  // the final submission from Safari.
  //
  // Generally speaking, we will try to submit our final harvest from either
  // pagehide or unload, whichever comes first, but in Firefox, we need to avoid
  // attempting to submit from pagehide to ensure that we don't slow down loading
  // of the next page.
  if (!ffVersion || navigator.sendBeacon) {
    addE('pagehide', oneCall)
  } else {
    addE('beforeunload', oneCall)
  }
  addE('unload', oneCall)
}
