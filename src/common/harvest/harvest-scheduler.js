/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { submitData } from '../util/submit-data'
import { SharedContext } from '../context/shared-context'
import { Harvest, getSubmitMethod } from './harvest'
import { subscribeToEOL } from '../unload/eol'
import { getConfigurationValue } from '../config/config'

/**
 * Periodically invokes harvest calls and handles retries
 */
export class HarvestScheduler extends SharedContext {
  constructor (endpoint, opts, parent) {
    super(parent) // gets any allowed properties from the parent and stores them in `sharedContext`
    this.endpoint = endpoint
    this.opts = opts || {}
    this.started = false
    this.timeoutHandle = null
    this.aborted = false // this controls the per-interval and final harvests for the scheduler (currently per feature specific!)

    this.harvest = new Harvest(this.sharedContext)

    subscribeToEOL(() => {
      if (this.aborted) return

      // If opts.onUnload is defined, these are special actions to execute before attempting to send the final payload.
      if (this.opts.onUnload) this.opts.onUnload()
      this.runHarvest({ unload: true })
    }, getConfigurationValue(this.sharedContext.agentIdentifier, 'allow_bfcache')) // TO DO: remove feature flag after rls stable
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
    var timer = this

    if (delay == null) {
      delay = this.interval
    }
    this.timeoutHandle = setTimeout(() => {
      timer.timeoutHandle = null
      timer.runHarvest(opts)
    }, delay * 1000)
  }

  runHarvest (opts) {
    if (this.aborted) return
    var scheduler = this

    if (this.opts.getPayload) { // Ajax & PVT
      var submitMethod = getSubmitMethod(this.endpoint, opts)
      if (!submitMethod) return false

      var retry = submitMethod.method === submitData.xhr
      var payload = this.opts.getPayload({ retry: retry })
      if (payload) {
        payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload]
        for (var i = 0; i < payload.length; i++) {
          this.harvest.send(this.endpoint, payload[i], opts, submitMethod, onHarvestFinished)
        }
      }
    } else {
      const runAfterSending = opts?.unload ? undefined : onHarvestFinished // don't bother running onFinish handler if this is the final harvest
      this.harvest.sendX(this.endpoint, opts, runAfterSending)
    }

    if (this.started) {
      this.scheduleHarvest()
    }
    return

    function onHarvestFinished (result) {
      if (result.blocked) scheduler.onHarvestBlocked(opts, result)
      else scheduler.onHarvestFinished(opts, result)
    }
  }

  onHarvestFinished (opts, result) {
    if (this.opts.onFinished) {
      this.opts.onFinished(result)
    }

    if (result.sent && result.retry) {
      var delay = result.delay || this.opts.retryDelay
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
