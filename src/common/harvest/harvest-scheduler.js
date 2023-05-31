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
  /**
     * Create a HarvestScheduler
     * @param {string} endpoint - The base BAM endpoint name -- ex. 'events'
     * @param {object} opts - The options used to configure the HarvestScheduler
     * @param {Function} opts.onFinished - The callback to be fired when a harvest has finished
     * @param {Function} opts.getPayload - A callback which can be triggered to return a payload for harvesting
     * @param {number} opts.retryDelay - The number of seconds to wait before retrying after a network failure
     * @param {boolean} opts.raw - Use a prefabricated payload shape as the harvest payload without the need for formatting
     * @param {string} opts.customUrl - A custom url that falls outside of the shape of the standard BAM harvester url pattern.  Will use directly instead of concatenating various pieces
     * @param {*} parent - The parent object, whose state can be passed into SharedContext
     */
  constructor (endpoint, opts, parent) {
    super(parent) // gets any allowed properties from the parent and stores them in `sharedContext`
    this.endpoint = endpoint
    this.opts = opts || {}
    this.started = false
    this.timeoutHandle = null
    this.aborted = false // this controls the per-interval and final harvests for the scheduler (currently per feature specific!)

    this.harvest = new Harvest(this.sharedContext)

    // unload if EOL mechanism fires
    subscribeToEOL(this.unload.bind(this), getConfigurationValue(this.sharedContext.agentIdentifier, 'allow_bfcache')) // TO DO: remove feature flag after rls stable

    // unload if session resets
    this.sharedContext?.ee.on('session-reset', this.unload.bind(this))
  }

  unload () {
    if (this.aborted) return
    // If opts.onUnload is defined, these are special actions to execute before attempting to send the final payload.
    if (this.opts.onUnload) this.opts.onUnload()
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

    let harvests = []
    let submitMethod

    if (this.opts.getPayload) { // Ajax & PVT & SR
      submitMethod = getSubmitMethod(this.endpoint, opts)
      if (!submitMethod) return false

      const retry = submitMethod.method === submitData.xhr
      var payload = this.opts.getPayload({ retry: retry })

      if (!payload) {
        if (this.started) {
          this.scheduleHarvest()
        }
        return
      }

      payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload]
      harvests.push(...payload)
    }

    /** sendX is used for features that do not supply a preformatted payload via "getPayload" */
    let send = args => this.harvest.sendX(args)
    if (harvests.length) {
      /** _send is the underlying method for sending in the harvest, if sending raw we can bypass the other helpers completely which format the payloads */
      if (this.opts.raw) send = args => this.harvest._send(args)
      /** send is used to formated the payloads from "getPayload" and obfuscate before sending */
      else send = args => this.harvest.send(args)
    } else {
      // force it to run at least once in sendX mode
      harvests.push(undefined)
    }

    harvests.forEach(payload => {
      send({
        endpoint: this.endpoint,
        payload,
        opts,
        submitMethod,
        cbFinished: onHarvestFinished,
        customUrl: this.opts.customUrl,
        raw: this.opts.raw
      })
    })

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
