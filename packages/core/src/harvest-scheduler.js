/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var harvest = require('./harvest')
var submitData = require('./submit-data')

module.exports = HarvestScheduler

/**
 * Periodically invokes harvest calls and handles retries
 */
function HarvestScheduler(endpoint, opts) {
  this.endpoint = endpoint
  this.opts = opts || {}
  this.started = false
  this.timeoutHandle = null
}

HarvestScheduler.prototype.startTimer = function startTimer(interval, initialDelay) {
  this.interval = interval
  this.started = true
  this.scheduleHarvest(initialDelay != null ? initialDelay : this.interval)
}

HarvestScheduler.prototype.stopTimer = function stopTimer() {
  this.started = false
  if (this.timeoutHandle) {
    clearTimeout(this.timeoutHandle)
  }
}

HarvestScheduler.prototype.scheduleHarvest = function scheduleHarvest(delay, opts) {
  if (this.timeoutHandle) return
  var timer = this

  if (delay == null) {
    delay = this.interval
  }
  this.timeoutHandle = setTimeout(function() {
    timer.timeoutHandle = null
    timer.runHarvest(opts)
  }, delay * 1000)
}

HarvestScheduler.prototype.runHarvest = function runHarvest(opts) {
  var scheduler = this

  if (this.opts.getPayload) {
    var submitMethod = harvest.getSubmitMethod(this.endpoint, opts)
    if (!submitMethod) return false

    var retry = submitMethod.method === submitData.xhr
    var payload = this.opts.getPayload({ retry: retry })
    if (payload) {
      payload = Object.prototype.toString.call(payload) === '[object Array]' ? payload : [payload]
      for (var i = 0; i < payload.length; i++) {
        harvest.send(this.endpoint, payload[i], opts, submitMethod, onHarvestFinished)
      }
    }
  } else {
    harvest.sendX(this.endpoint, opts, onHarvestFinished)
  }

  if (this.started) {
    this.scheduleHarvest()
  }

  function onHarvestFinished(result) {
    scheduler.onHarvestFinished(opts, result)
  }
}

HarvestScheduler.prototype.onHarvestFinished = function onHarvestFinished(opts, result) {
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
