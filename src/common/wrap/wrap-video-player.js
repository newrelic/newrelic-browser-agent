/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps native timeout and interval methods for instrumentation.
 * This module is used by: jserrors, spa.
 */

import { ee as baseEE } from '../event-emitter/contextual-ee'
import { generateRandomHexString } from '../ids/unique-id'
import { debounce } from '../util/invoke'

/**
 * Wraps a supplied function and adds emitter events under the `-wrap-logger-` prefix
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @param {Object} parent - The parent object housing the logger function
 * @param {string} loggerFn - The name of the function in the parent object to wrap
 * @returns {Object} Scoped event emitter with a debug ID of `logger`.
 */
// eslint-disable-next-line
export function wrapVideoPlayer(sharedEE, video) {
  const ee = scopedEE(sharedEE)
  const videoPlayerId = generateRandomHexString(6)
  const emitter = (eventName, evt) => {
    const eventSource = evt.target.currentSrc
    ee.emit('video-player', [performance.now(), eventName, { videoPlayerId, eventSource }])
  }

  console.log('wrap', video)
  video.addEventListener('play', evt => {
    console.log('play...')
    emitter('play', evt)
  })
  video.addEventListener('pause', evt => {
    console.log('pause...')
    emitter('pause', evt)
  })
  video.addEventListener('playing', evt => {
    console.log('resume (playing)...')
    emitter('resume', evt)
  })
  video.addEventListener('ended', evt => {
    console.log('end (ended)...')
    emitter('end', evt)
  })
  video.addEventListener('stalled', evt => {
    console.log('stall (stalled)...')
    emitter('stall', evt)
  })
  video.addEventListener('seeked', evt => {
    console.log('seek (seeked)...')
    emitter('seek', evt)
  })
  video.addEventListener('volumechange', evt => {
    console.log('volume (volumechange)...')
    debounce(() => emitter('volume', evt), 100, { leading: true })
  })
  video.addEventListener('waiting', evt => {
    console.log('buffer (waiting)...')
    emitter('buffer', evt)
  })
  console.log('observing video', video)
  return ee
}

/**
 * Returns an event emitter scoped specifically for the `logger` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'logger'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('video')
}
