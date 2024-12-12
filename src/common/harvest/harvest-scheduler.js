/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as submitData from '../util/submit-data'
import { Harvest } from './harvest'
import { subscribeToEOL } from '../unload/eol'
import { SESSION_EVENTS } from '../session/constants'

/**
 * Periodically invokes harvest calls and handles retries
 */
export class HarvestScheduler {
  /**
     * Create a HarvestScheduler
     * @param {string} endpoint - The base BAM endpoint name -- ex. 'events'
     * @param {object} opts - The options used to configure the HarvestScheduler
     * @param {Function} opts.onFinished - The callback to be fired when a harvest has finished
     * @param {Function} opts.getPayload - A callback which can be triggered to return a payload for harvesting
     * @param {number} opts.retryDelay - The number of seconds to wait before retrying after a network failure
     * @param {boolean} opts.raw - Use a prefabricated payload shape as the harvest payload without the need for formatting
     * @param {string} opts.customUrl - A custom url that falls outside of the shape of the standard BAM harvester url pattern.  Will use directly instead of concatenating various pieces
     * @param {Object} parent - The parent object
     */
  constructor (endpoint, opts, parent) {
    this.agentRef = parent.agentRef
    this.endpoint = endpoint
    this.opts = opts || {}
    this.started = false
    this.timeoutHandle = null
    this.aborted = false // this controls the per-interval and final harvests for the scheduler (currently per feature specific!)
    this.harvesting = false
    this.harvest = new Harvest(this)

    // If a feature specifies stuff to be done on page unload, those are frontrunned (via capture phase) before ANY feature final harvests.
    if (typeof this.opts.onUnload === 'function') subscribeToEOL(this.opts.onUnload, true)
    subscribeToEOL(this.unload.bind(this)) // this should consist only of sending final harvest

    /* Flush all buffered data if session resets and give up retries. This should be synchronous to ensure that the correct `session` value is sent.
      Since session-reset generates a new session ID and the ID is grabbed at send-time, any delays or retries would cause the payload to be sent under
      the wrong session ID. */
    this.agentRef?.ee?.on(SESSION_EVENTS.RESET, () => this.runHarvest({ forceNoRetry: true }))
  }

  /**
   * This function is only meant for the last outgoing harvest cycle of a page. It trickles down to using sendBeacon, which should not be used
   * to send payloads while the page is still active, due to limitations on how much data can be buffered in the API at any one time.
   */
  unload () {
    if (this.aborted) return
    this.runHarvest({ unload: true })
  }

  startTimer (interval, initialDelay) {
    this.interval = interval
    this.started = true
    this.scheduleHarvest(initialDelay != null ? initialDelay : this.interval)
  }

  stopTimer (permanently = false) {
    this.aborted = permanently // stopping permanently is same as aborting, but this function also cleans up the setTimeout loop
    this.started = false
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
    }
  }

  scheduleHarvest (delay, opts) {
    if (this.timeoutHandle) return

    if (delay == null) {
      delay = this.interval
    }
    this.timeoutHandle = setTimeout(() => {
      this.timeoutHandle = null
      this.runHarvest(opts)
    }, delay * 1000)
  }

  runHarvest (opts) {
    if (this.aborted) return

    const continueSchedule = () => {
      if (this.started) {
        this.scheduleHarvest()
      }
    }

    this.harvesting = true

    let harvests = []
    let submitMethod
    let payload

    if (this.opts.getPayload) {
      // Ajax, PVT, Softnav, Logging, SR & ST features provide a single callback function to get data for harvesting
      submitMethod = submitData.getSubmitMethod({ isFinalHarvest: opts?.unload })
      if (!submitMethod) return false

      const retry = !opts?.unload && submitMethod === submitData.xhr
      payload = this.opts.getPayload({ retry, ...opts })

      if (!payload) {
        continueSchedule()
        return
      }

      payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload]
      harvests.push(...payload)
    }

    harvests.forEach(harvest => {
      if (!harvest?.payload) {
        continueSchedule()
        return
      }
      this.harvest.send({
        endpoint: this.endpoint,
        target: harvest.target,
        payload: harvest.payload,
        opts,
        submitMethod,
        cbFinished: (result) => {
          this.harvesting = false
          if (opts?.forceNoRetry) result.retry = false // discard unsent data rather than re-queuing for next harvest attempt
          this.onHarvestFinished(opts, result)
        },
        customUrl: this.opts.customUrl,
        raw: this.opts.raw
      })
    })

    continueSchedule()
  }

  onHarvestFinished (opts, result) {
    if (this.opts.onFinished) {
      this.opts.onFinished(result)
    }

    if (result.sent && result.retry) {
      const delay = result.delay || this.opts.retryDelay
      // reschedule next harvest if should be delayed longer
      if (this.started && delay) {
        clearTimeout(this.timeoutHandle)
        this.timeoutHandle = null
        this.scheduleHarvest(delay, opts)
      } else if (!this.started && delay) {
        // if not running on a timer, schedule a single retry
        this.scheduleHarvest(delay, opts)
      }
    }
  }
}
