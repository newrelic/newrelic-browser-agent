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
  const emitter = (eventName) => ee.emit('video-player', [performance.now(), eventName, { videoPlayerId }])

  console.log('wrap', video)
  video.addEventListener('play', evt => {
    console.log('play...', Date.now(), evt)
    emitter('play')
  })
  video.addEventListener('pause', evt => {
    console.log('pause...', Date.now(), evt)
    emitter('pause')
  })
  video.addEventListener('playing', evt => {
    console.log('resume (playing)...', Date.now(), evt)
    emitter('resume')
  })
  video.addEventListener('ended', evt => {
    console.log('end (ended)...', Date.now(), evt)
    emitter('end')
  })
  video.addEventListener('stalled', evt => {
    console.log('stall (stalled)...', evt)
    emitter('stall')
  })
  video.addEventListener('seeking', evt => {
    console.log('seek (seeking)...', evt)
    emitter('seek')
  })
  video.addEventListener('volumechange', evt => {
    console.log('volume (volumechange)...', evt)
    emitter('volume')
  })
  video.addEventListener('waiting', evt => {
    console.log('buffer (waiting)...', evt)
    emitter('buffer')
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
