/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { record as recorder } from 'rrweb'
import { stringify } from '../../../common/util/stringify'
import { AVG_COMPRESSION, CHECKOUT_MS, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES } from '../constants'
import { RecorderEvents } from './recorder-events'
import { MODE } from '../../../common/session/constants'
import { stylesheetEvaluator } from './stylesheet-evaluator'
import { handle } from '../../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { customMasker } from './utils'
import { IDEAL_PAYLOAD_SIZE, SESSION_ERROR } from '../../../common/constants/agent-constants'
import { warn } from '../../../common/util/console'
import { single } from '../../../common/util/invoke'
import { registerHandler } from '../../../common/event-emitter/register-handler'

const RRWEB_DATA_CHANNEL = 'rrweb-data'

export class Recorder {
  /** flag that if true, blocks events from being "stored".  Only set to true when a full snapshot has incomplete nodes (only stylesheets ATM) */
  #fixing = false

  #warnCSSOnce = single(() => warn(47)) // notifies user of potential replayer issue if fix_stylesheets is off

  #canRecord = true

  triggerHistory = [] // useful for debugging

  constructor (srInstrument) {
    /** The parent classes that share the recorder */
    this.srInstrument = srInstrument
    // --- shortcuts
    this.ee = srInstrument.ee
    this.srFeatureName = srInstrument.featureName
    this.agentRef = srInstrument.agentRef

    this.isErrorMode = false
    /** A flag that can be set to false by failing conversions to stop the fetching process */
    this.shouldFix = this.agentRef.init.session_replay.fix_stylesheets

    /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
    this.events = new RecorderEvents(this.shouldFix)
    /** Backlog used for a 2-part sliding window to guarantee a 15-30s buffer window */
    this.backloggedEvents = new RecorderEvents(this.shouldFix)
    /** Only set to true once a snapshot node has been processed.  Used to block harvests from sending before we know we have a snapshot */
    this.hasSeenSnapshot = false
    /** Hold on to the last meta node, so that it can be re-inserted if the meta and snapshot nodes are broken up due to harvesting */
    this.lastMeta = false
    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { this.agentRef.runtime.isRecording = false }

    registerHandler(SESSION_ERROR, () => {
      this.#canRecord = false
      this.stopRecording()
    }, this.srFeatureName, this.ee)

    /** If Agg is already drained before importing the recorder (likely deferred API call pattern),
     * registerHandler wont do anything. Just set up the on listener directly */
    const processReplayNode = (event, isCheckout) => { this.audit(event, isCheckout) }
    if (this.srInstrument.featAggregate?.drained) this.ee.on(RRWEB_DATA_CHANNEL, processReplayNode)
    else registerHandler(RRWEB_DATA_CHANNEL, processReplayNode, this.srFeatureName, this.ee)
  }

  get trigger () {
    return this.triggerHistory[this.triggerHistory.length - 1]
  }

  getEvents () {
    return {
      events: [...this.backloggedEvents.events, ...this.events.events].filter(x => x),
      type: 'standard',
      cycleTimestamp: Math.min(this.backloggedEvents.cycleTimestamp, this.events.cycleTimestamp),
      payloadBytesEstimation: this.backloggedEvents.payloadBytesEstimation + this.events.payloadBytesEstimation,
      hasError: this.backloggedEvents.hasError || this.events.hasError,
      hasMeta: this.backloggedEvents.hasMeta || this.events.hasMeta,
      hasSnapshot: this.backloggedEvents.hasSnapshot || this.events.hasSnapshot,
      inlinedAllStylesheets: (!!this.backloggedEvents.events.length && this.backloggedEvents.inlinedAllStylesheets) || this.events.inlinedAllStylesheets
    }
  }

  /** Clears the buffer (this.events), and resets all payload metadata properties */
  clearBuffer () {
    this.backloggedEvents = (this.isErrorMode) ? this.events : new RecorderEvents(this.shouldFix)
    this.events = new RecorderEvents(this.shouldFix)
  }

  /** Begin recording using configured recording lib */
  startRecording (trigger, mode) {
    if (!this.#canRecord) return
    this.triggerHistory.push(trigger) // keep track of all triggers, useful for lifecycle debugging.  "this.trigger" returns the latest entry

    this.isErrorMode = mode === MODE.ERROR

    /** if the recorder is already recording... lets stop it before starting a new one */
    this.stopRecording()

    this.agentRef.runtime.isRecording = true
    const { block_class, ignore_class, mask_text_class, block_selector, mask_input_options, mask_text_selector, mask_all_inputs, inline_images, collect_fonts } = this.agentRef.init.session_replay

    // set up rrweb configurations for maximum privacy --
    // https://newrelic.atlassian.net/wiki/spaces/O11Y/pages/2792293280/2023+02+28+Browser+-+Session+Replay#Configuration-options
    let stop
    try {
      stop = recorder({
        emit: (event, isCheckout) => { handle(RRWEB_DATA_CHANNEL, [event, isCheckout], undefined, this.srFeatureName, this.ee) },
        blockClass: block_class,
        ignoreClass: ignore_class,
        maskTextClass: mask_text_class,
        blockSelector: block_selector,
        maskInputOptions: mask_input_options,
        maskTextSelector: mask_text_selector,
        maskTextFn: customMasker,
        maskAllInputs: mask_all_inputs,
        maskInputFn: customMasker,
        inlineStylesheet: true,
        inlineImages: inline_images,
        collectFonts: collect_fonts,
        checkoutEveryNms: CHECKOUT_MS[mode],
        recordAfter: 'DOMContentLoaded'
      })
    } catch (err) {
      this.ee.emit('internal-error', [err])
    }

    this.stopRecording = () => {
      this.agentRef.runtime.isRecording = false
      stop?.()
    }
  }

  /**
   * audit - Checks if the event node payload is missing certain attributes
   * will forward on to the "store" method if nothing needs async fixing
   * @param {*} event - An RRWEB event node
   * @param {*} isCheckout - Flag indicating if the payload was triggered as a checkout
   */
  audit (event, isCheckout) {
    /** An count of stylesheet objects that were blocked from accessing contents via JS */
    const incompletes = this.agentRef.init.session_replay.fix_stylesheets ? stylesheetEvaluator.evaluate() : 0
    const missingInlineSMTag = 'SessionReplay/Payload/Missing-Inline-Css/'
    /** only run the full fixing behavior (more costly) if fix_stylesheets is configured as on (default behavior) */
    if (!this.shouldFix) {
      if (incompletes > 0) {
        this.events.inlinedAllStylesheets = false
        this.#warnCSSOnce()
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Skipped', incompletes], undefined, FEATURE_NAMES.metrics, this.ee)
      }
      return this.store(event, isCheckout)
    }
    /** Only stop ignoring data if already ignoring and a new valid snapshap is taking place (0 incompletes and we get a meta node for the snap) */
    if (!incompletes && this.#fixing && event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = false
    if (incompletes > 0) {
      /** wait for the evaluator to download/replace the incompletes' src code and then take a new snap */
      stylesheetEvaluator.fix().then((failedToFix) => {
        if (failedToFix > 0) {
          this.events.inlinedAllStylesheets = false
          this.shouldFix = false
        }
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Failed', failedToFix], undefined, FEATURE_NAMES.metrics, this.ee)
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Fixed', incompletes - failedToFix], undefined, FEATURE_NAMES.metrics, this.ee)
        this.takeFullSnapshot()
      })
      /** Only start ignoring data if got a faulty snapshot */
      if (event.type === RRWEB_EVENT_TYPES.FullSnapshot || event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = true
    }
    /** Only store the data if not being "fixed" (full snapshots that have broken css) */
    if (!this.#fixing) this.store(event, isCheckout)
  }

  /** Store a payload in the buffer (this.events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    if (!event || this.srInstrument.featAggregate?.blocked) return

    /** because we've waited until draining to process the buffered rrweb events, we can guarantee the timekeeper exists */
    event.timestamp = this.agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(event.timestamp)
    event.__serialized = stringify(event)
    const eventBytes = event.__serialized.length
    /** The estimated size of the payload after compression */
    const payloadSize = this.getPayloadSize(eventBytes)
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['rrweb/node/' + event.type + '/bytes', eventBytes], undefined, FEATURE_NAMES.metrics, this.ee)
    // Checkout events are flags by the recording lib that indicate a fullsnapshot was taken every n ms. These are important
    // to help reconstruct the replay later and must be included.  While waiting and buffering for errors to come through,
    // each time we see a new checkout, we can drop the old data.
    // we need to check for meta because rrweb will flag it as checkout twice, once for meta, then once for snapshot
    if (this.isErrorMode && isCheckout && event.type === RRWEB_EVENT_TYPES.Meta) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    // meta event
    this.events.hasMeta ||= event.type === RRWEB_EVENT_TYPES.Meta
    // snapshot event
    this.events.hasSnapshot ||= this.hasSeenSnapshot ||= event.type === RRWEB_EVENT_TYPES.FullSnapshot

    //* dont let the EventBuffer class double evaluate the event data size, it's a performance burden and we have special reasons to do it outside the event buffer */
    this.events.add(event, eventBytes)

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (((this.events.hasSnapshot && this.events.hasMeta) || payloadSize > IDEAL_PAYLOAD_SIZE) && !this.isErrorMode) {
      // if we've made it to the ideal size of ~16kb before the interval timer, we should send early.
      this.agentRef.runtime.harvester.triggerHarvestFor(this.srInstrument.featAggregate)
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    try {
      if (!this.agentRef.runtime.isRecording) return
      recorder.takeFullSnapshot()
    } catch (err) {
      // in the off chance we think we are recording, but rrweb does not, rrweb's lib will throw an error.  This catch is just a precaution
    }
  }

  clearTimestamps () {
    this.events.cycleTimestamp = undefined
  }

  /** Estimate the payload size */
  getPayloadSize (newBytes = 0) {
    // the query param padding constant gives us some padding for the other metadata to be safely injected
    return this.estimateCompression(this.events.payloadBytesEstimation + newBytes) + QUERY_PARAM_PADDING
  }

  /** Extensive research has yielded about an 88% compression factor on these payloads.
   * This is an estimation using that factor as to not cause performance issues while evaluating
   * https://staging.onenr.io/037jbJWxbjy
   * */
  estimateCompression (data) {
    if (!!this.srInstrument.featAggregate?.gzipper && !!this.srInstrument.featAggregate?.u8) return data * AVG_COMPRESSION
    return data
  }
}
