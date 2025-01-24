/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { record as recorder } from 'rrweb'
import { stringify } from '../../../common/util/stringify'
import { AVG_COMPRESSION, CHECKOUT_MS, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES, SR_EVENT_EMITTER_TYPES } from '../constants'
import { RecorderEvents } from './recorder-events'
import { MODE } from '../../../common/session/constants'
import { stylesheetEvaluator } from './stylesheet-evaluator'
import { handle } from '../../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { buildNRMetaNode } from './utils'
import { IDEAL_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'
import { AggregateBase } from '../../utils/aggregate-base'

export class Recorder {
  /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
  #events
  /** Backlog used for a 2-part sliding window to guarantee a 15-30s buffer window */
  #backloggedEvents
  /** array of recorder events -- Will be filled only if forced harvest was triggered and harvester does not exist */
  #preloaded
  /** flag that if true, blocks events from being "stored".  Only set to true when a full snapshot has incomplete nodes (only stylesheets ATM) */
  #fixing = false

  constructor (parent) {
    /** Event Buffers */
    this.#events = new RecorderEvents(this.shouldFix)
    this.#backloggedEvents = new RecorderEvents(this.shouldFix)
    this.#preloaded = [new RecorderEvents(this.shouldFix)]
    /** True when actively recording, false when paused or stopped */
    this.recording = false
    /** The pointer to the current bucket holding rrweb events */
    this.currentBufferTarget = this.#events
    /** Only set to true once a snapshot node has been processed.  Used to block preload harvests from sending before we know we have a snapshot */
    this.hasSeenSnapshot = false
    /** Hold on to the last meta node, so that it can be re-inserted if the meta and snapshot nodes are broken up due to harvesting */
    this.lastMeta = false
    /** The parent class that instantiated the recorder */
    this.parent = parent
    /** A flag that can be set to false by failing conversions to stop the fetching process */
    this.shouldFix = this.parent.agentRef.init.session_replay.fix_stylesheets
    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }
  }

  getEvents () {
    if (this.#preloaded[0]?.events.length) {
      return {
        ...this.#preloaded[0],
        events: this.#preloaded[0].events,
        payloadBytesEstimation: this.#preloaded[0].payloadBytesEstimation,
        type: 'preloaded'
      }
    }
    return {
      events: [...this.#backloggedEvents.events, ...this.#events.events].filter(x => x),
      type: 'standard',
      cycleTimestamp: Math.min(this.#backloggedEvents.cycleTimestamp, this.#events.cycleTimestamp),
      payloadBytesEstimation: this.#backloggedEvents.payloadBytesEstimation + this.#events.payloadBytesEstimation,
      hasError: this.#backloggedEvents.hasError || this.#events.hasError,
      hasMeta: this.#backloggedEvents.hasMeta || this.#events.hasMeta,
      hasSnapshot: this.#backloggedEvents.hasSnapshot || this.#events.hasSnapshot,
      inlinedAllStylesheets: (!!this.#backloggedEvents.events.length && this.#backloggedEvents.inlinedAllStylesheets) || this.#events.inlinedAllStylesheets
    }
  }

  /** Clears the buffer (this.#events), and resets all payload metadata properties */
  clearBuffer () {
    if (this.#preloaded[0]?.events.length) this.#preloaded.shift()
    else if (this.parent.mode === MODE.ERROR) this.#backloggedEvents = this.#events
    else this.#backloggedEvents = new RecorderEvents(this.shouldFix)
    this.#events = new RecorderEvents(this.shouldFix)
  }

  /** Begin recording using configured recording lib */
  startRecording () {
    this.recording = true
    const { block_class, ignore_class, mask_text_class, block_selector, mask_input_options, mask_text_selector, mask_all_inputs, inline_images, collect_fonts } = this.parent.agentRef.init.session_replay
    const customMasker = (text, element) => {
      try {
        if (typeof element?.type === 'string' && element.type.toLowerCase() !== 'password' && (element?.dataset?.nrUnmask !== undefined || element?.classList?.contains('nr-unmask'))) return text
      } catch (err) {
        // likely an element was passed to this handler that was invalid and was missing attributes or methods
      }
      return '*'.repeat(text?.length || 0)
    }
    // set up rrweb configurations for maximum privacy --
    // https://newrelic.atlassian.net/wiki/spaces/O11Y/pages/2792293280/2023+02+28+Browser+-+Session+Replay#Configuration-options
    const stop = recorder({
      emit: this.audit.bind(this),
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
      checkoutEveryNms: CHECKOUT_MS[this.parent.mode],
      recordAfter: 'DOMContentLoaded'
    })

    this.stopRecording = () => {
      this.recording = false
      this.parent.ee.emit(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, [false, this.parent.mode])
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
    const incompletes = this.parent.agentRef.init.session_replay.fix_stylesheets ? stylesheetEvaluator.evaluate() : 0
    const missingInlineSMTag = 'SessionReplay/Payload/Missing-Inline-Css/'
    /** only run the full fixing behavior (more costly) if fix_stylesheets is configured as on (default behavior) */
    if (!this.shouldFix) {
      if (incompletes > 0) {
        this.currentBufferTarget.inlinedAllStylesheets = false
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Skipped', incompletes], undefined, FEATURE_NAMES.metrics, this.parent.ee)
      }
      return this.store(event, isCheckout)
    }
    /** Only stop ignoring data if already ignoring and a new valid snapshap is taking place (0 incompletes and we get a meta node for the snap) */
    if (!incompletes && this.#fixing && event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = false
    if (incompletes > 0) {
      /** wait for the evaluator to download/replace the incompletes' src code and then take a new snap */
      stylesheetEvaluator.fix().then((failedToFix) => {
        if (failedToFix > 0) {
          this.currentBufferTarget.inlinedAllStylesheets = false
          this.shouldFix = false
        }
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Failed', failedToFix], undefined, FEATURE_NAMES.metrics, this.parent.ee)
        handle(SUPPORTABILITY_METRIC_CHANNEL, [missingInlineSMTag + 'Fixed', incompletes - failedToFix], undefined, FEATURE_NAMES.metrics, this.parent.ee)
        this.takeFullSnapshot()
      })
      /** Only start ignoring data if got a faulty snapshot */
      if (event.type === RRWEB_EVENT_TYPES.FullSnapshot || event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = true
    }
    /** Only store the data if not being "fixed" (full snapshots that have broken css) */
    if (!this.#fixing) this.store(event, isCheckout)
  }

  /** Store a payload in the buffer (this.#events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    if (!event) return

    if (!(this.parent instanceof AggregateBase) && this.#preloaded.length) this.currentBufferTarget = this.#preloaded[this.#preloaded.length - 1]
    else this.currentBufferTarget = this.#events

    if (this.parent.blocked) return

    if (!this.notified) {
      this.parent.ee.emit(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, [true, this.parent.mode])
      this.notified = true
    }

    if (this.parent.timeKeeper?.ready && !event.__newrelic) {
      event.__newrelic = buildNRMetaNode(event.timestamp, this.parent.timeKeeper)
      event.timestamp = this.parent.timeKeeper.correctAbsoluteTimestamp(event.timestamp)
    }
    event.__serialized = stringify(event)
    const eventBytes = event.__serialized.length
    /** The estimated size of the payload after compression */
    const payloadSize = this.getPayloadSize(eventBytes)
    // Checkout events are flags by the recording lib that indicate a fullsnapshot was taken every n ms. These are important
    // to help reconstruct the replay later and must be included.  While waiting and buffering for errors to come through,
    // each time we see a new checkout, we can drop the old data.
    // we need to check for meta because rrweb will flag it as checkout twice, once for meta, then once for snapshot
    if (this.parent.mode === MODE.ERROR && isCheckout && event.type === RRWEB_EVENT_TYPES.Meta) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    // meta event
    if (event.type === RRWEB_EVENT_TYPES.Meta) {
      this.currentBufferTarget.hasMeta = true
    }
    // snapshot event
    if (event.type === RRWEB_EVENT_TYPES.FullSnapshot) {
      this.currentBufferTarget.hasSnapshot = true
      this.hasSeenSnapshot = true
    }
    this.currentBufferTarget.add(event)

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (((event.type === RRWEB_EVENT_TYPES.FullSnapshot && this.currentBufferTarget.hasMeta) || payloadSize > IDEAL_PAYLOAD_SIZE) && this.parent.mode === MODE.FULL) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      if (this.parent instanceof AggregateBase) {
        this.parent.agentRef.runtime.harvester.triggerHarvestFor(this.parent)
      } else {
        // we are still in "preload" and it triggered a "stop point".  Make a new set, which will get pointed at on next cycle
        this.#preloaded.push(new RecorderEvents(this.shouldFix))
      }
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    try {
      if (!this.recording) return
      recorder.takeFullSnapshot()
    } catch (err) {
      // in the off chance we think we are recording, but rrweb does not, rrweb's lib will throw an error.  This catch is just a precaution
    }
  }

  clearTimestamps () {
    this.currentBufferTarget.cycleTimestamp = undefined
  }

  /** Estimate the payload size */
  getPayloadSize (newBytes = 0) {
    // the query param padding constant gives us some padding for the other metadata to be safely injected
    return this.estimateCompression(this.currentBufferTarget.payloadBytesEstimation + newBytes) + QUERY_PARAM_PADDING
  }

  /** Extensive research has yielded about an 88% compression factor on these payloads.
   * This is an estimation using that factor as to not cause performance issues while evaluating
   * https://staging.onenr.io/037jbJWxbjy
   * */
  estimateCompression (data) {
    if (!!this.parent.gzipper && !!this.parent.u8) return data * AVG_COMPRESSION
    return data
  }
}
