/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Records, aggregates, and harvests session replay data.
 *
 * NOTE: This code is under development and dormant. It will not download to instrumented pages or record any data.
 * It is not production ready, and is not intended to be imported or implemented in any build of the browser agent until
 * functionality is validated and a full user experience is curated.
 */

import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { SESSION_EVENTS, MODE, SESSION_EVENT_TYPES } from '../../../common/session/session-entity'
import { AggregateBase } from '../../utils/aggregate-base'
import { sharedChannel } from '../../../common/constants/shared-channel'
import { obj as encodeObj } from '../../../common/url/encode'
import { warn } from '../../../common/util/console'
import { globalScope } from '../../../common/constants/runtime'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { RRWEB_VERSION } from '../../../common/constants/env'
import { now } from '../../../common/timing/now'

export const AVG_COMPRESSION = 0.12

export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}

const ABORT_REASONS = {
  RESET: {
    message: 'Session was reset',
    sm: 'Reset'
  },
  IMPORT: {
    message: 'Recorder failed to import',
    sm: 'Import'
  },
  TOO_MANY: {
    message: '429: Too Many Requests',
    sm: 'Too-Many'
  },
  TOO_BIG: {
    message: 'Payload was too large',
    sm: 'Too-Big'
  },
  CROSS_TAB: {
    message: 'Session Entity was set to OFF on another tab',
    sm: 'Cross-Tab'
  }
}

let recorder, gzipper, u8

/** Vortex caps payload sizes at 1MB */
export const MAX_PAYLOAD_SIZE = 1000000
/** Unloading caps around 64kb */
export const IDEAL_PAYLOAD_SIZE = 64000
/** Reserved room for query param attrs */
const QUERY_PARAM_PADDING = 5000
/** Interval between forcing new full snapshots -- 15 seconds in error mode (x2), 5 minutes in full mode */
const CHECKOUT_MS = { [MODE.ERROR]: 15000, [MODE.FULL]: 300000, [MODE.OFF]: 0 }

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
    this.events = []
    /** Backlog used for a 2-part sliding window to guarantee a 15-30s buffer window */
    this.backloggedEvents = []
    /** The interval to harvest at.  This gets overridden if the size of the payload exceeds certain thresholds */
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'session_replay.harvestTimeSeconds') || 60
    /** Set once the recorder has fully initialized after flag checks and sampling */
    this.initialized = false
    /** Set once an error has been detected on the page. Never unset */
    this.errorNoticed = false
    /** The "mode" to record in.  Defaults to "OFF" until flags and sampling are checked. See "MODE" constant. */
    this.mode = MODE.OFF
    /** Set once the feature has been "aborted" to prevent other side-effects from continuing */
    this.blocked = false
    /** True when actively recording, false when paused or stopped */
    this.recording = false
    /** can shut off efforts to compress the data */
    this.shouldCompress = true

    /** Payload metadata -- Should indicate that the payload being sent has a full DOM snapshot. This can happen
     * -- When the recording library begins recording, it starts by taking a DOM snapshot
     * -- When visibility changes from "hidden" -> "visible", it must capture a full snapshot for the replay to work correctly across tabs
    */
    this.hasSnapshot = false
    /** Payload metadata -- Should indicate that the payload being sent has a meta node. The meta node should always precede a snapshot node. */
    this.hasMeta = false
    /** Payload metadata -- Should indicate that the payload being sent contains an error.  Used for query/filter purposes in UI */
    this.hasError = false

    /** Payload metadata -- Should indicate when a replay blob started recording.  Resets each time a harvest occurs.
     * cycle timestamps are used as fallbacks if event timestamps cannot be used
     */
    this.cycleTimestamp = undefined

    /** A value which increments with every new mutation node reported. Resets after a harvest is sent */
    this.payloadBytesEstimation = 0

    /** Hold on to the last meta node, so that it can be re-inserted if the meta and snapshot nodes are broken up due to harvesting */
    this.lastMeta = undefined

    /** set by BCS response */
    this.entitled = false

    const shouldSetup = (
      getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true &&
      getConfigurationValue(agentIdentifier, 'session_trace.enabled') === true
    )

    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }

    if (shouldSetup) {
      // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
      this.ee.on(SESSION_EVENTS.RESET, () => {
        this.abort(ABORT_REASONS.RESET)
      })

      // The SessionEntity class can emit a message indicating the session was paused (visibility change). This feature must stop recording if that occurs.
      this.ee.on(SESSION_EVENTS.PAUSE, () => { this.stopRecording() })
      // The SessionEntity class can emit a message indicating the session was resumed (visibility change). This feature must start running again (if already running) if that occurs.
      this.ee.on(SESSION_EVENTS.RESUME, () => {
        // if the mode changed on a different tab, it needs to update this instance to match
        const { session } = getRuntime(this.agentIdentifier)
        this.mode = session.state.sessionReplayMode
        if (!this.initialized || this.mode === MODE.OFF) return
        this.startRecording()
      })

      this.ee.on(SESSION_EVENTS.UPDATE, (type, data) => {
        if (!this.initialized || this.blocked || type !== SESSION_EVENT_TYPES.CROSS_TAB) return
        if (this.mode !== MODE.OFF && data.sessionReplayMode === MODE.OFF) this.abort(ABORT_REASONS.CROSS_TAB)
        this.mode = data.sessionReplay
      })

      // Bespoke logic for new endpoint.  This will change as downstream dependencies become solidified.
      this.scheduler = new HarvestScheduler('browser/blobs', {
        onFinished: this.onHarvestFinished.bind(this),
        retryDelay: this.harvestTimeSeconds,
        getPayload: this.prepareHarvest.bind(this),
        raw: true
      }, this)

      registerHandler('recordReplay', () => {
        // if it has aborted or BCS returned bad entitlements, do not allow
        if (this.blocked || !this.entitled) return
        // if it isnt already (fully) initialized... initialize it
        if (!recorder) this.initializeRecording(false, true, true)
        // its been initialized and imported the recorder but its not recording (mode === off || error)
        else if (this.mode !== MODE.FULL) this.switchToFull()
        // if it gets all the way to here, that means a full session is already recording... do nothing
      }, this.featureName, this.ee)

      registerHandler('pauseReplay', () => {
        this.forceStop(this.mode !== MODE.ERROR)
      }, this.featureName, this.ee)

      // Wait for an error to be reported.  This currently is wrapped around the "Error" feature.  This is a feature-feature dependency.
      // This was to ensure that all errors, including those on the page before load and those handled with "noticeError" are accounted for. Needs evalulation
      registerHandler('errorAgg', (e) => {
        this.hasError = true
        this.errorNoticed = true
        // run once
        if (this.mode === MODE.ERROR && globalScope?.document.visibilityState === 'visible') {
          this.switchToFull()
        }
      }, this.featureName, this.ee)

      this.waitForFlags(['sr']).then(([flagOn]) => {
        this.entitled = flagOn
        this.initializeRecording(
          (Math.random() * 100) < getConfigurationValue(this.agentIdentifier, 'session_replay.error_sampling_rate'),
          (Math.random() * 100) < getConfigurationValue(this.agentIdentifier, 'session_replay.sampling_rate')
        )
      }).then(() => sharedChannel.onReplayReady(this.mode)) // notify watchers that replay started with the mode

      this.drain()
    }
  }

  switchToFull () {
    this.mode = MODE.FULL
    // if the error was noticed AFTER the recorder was already imported....
    if (recorder && this.initialized) {
      this.stopRecording()
      this.startRecording()

      this.scheduler.startTimer(this.harvestTimeSeconds)

      this.syncWithSessionManager({ sessionReplayMode: this.mode })
    }
  }

  /**
   * Evaluate entitlements and sampling before starting feature mechanics, importing and configuring recording library, and setting storage state
   * @param {boolean} entitlements - the true/false state of the "sr" flag from RUM response
   * @param {boolean} errorSample - the true/false state of the error sampling decision
   * @param {boolean} fullSample - the true/false state of the full sampling decision
   * @param {boolean} ignoreSession - whether to force the method to ignore the session state and use just the sample flags
   * @returns {void}
   */
  async initializeRecording (errorSample, fullSample, ignoreSession) {
    this.initialized = true
    if (!this.entitled || this.recording) return

    const { session } = getRuntime(this.agentIdentifier)
    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    // if this isnt the FIRST load of a session AND
    // we are not actively recording SR... DO NOT import or run the recording library
    // session replay samples can only be decided on the first load of a session
    // session replays can continue if already in progress
    if (!session.isNew && !ignoreSession) { // inherit the mode of the existing session
      this.mode = session.state.sessionReplayMode
    } else {
      // The session is new... determine the mode the new session should start in
      if (fullSample) this.mode = MODE.FULL // full mode has precedence over error mode
      else if (errorSample) this.mode = MODE.ERROR
      // If neither are selected, then don't record (early return)
      else return
    }

    // If an error was noticed before the mode could be set (like in the early lifecycle of the page), immediately set to FULL mode
    if (this.mode === MODE.ERROR && this.errorNoticed) {
      this.mode = MODE.FULL
    }

    try {
      // Do not change the webpackChunkName or it will break the webpack nrba-chunking plugin
      recorder = (await import(/* webpackChunkName: "recorder" */'rrweb')).record
    } catch (err) {
      return this.abort(ABORT_REASONS.IMPORT)
    }

    // FULL mode records AND reports from the beginning, while ERROR mode only records (but does not report).
    // ERROR mode will do this until an error is thrown, and then switch into FULL mode.
    // If an error happened in ERROR mode before we've gotten to this stage, it will have already set the mode to FULL
    if (this.mode === MODE.FULL) {
      // We only report (harvest) in FULL mode
      this.scheduler.startTimer(this.harvestTimeSeconds)
    }

    try {
      // Do not change the webpackChunkName or it will break the webpack nrba-chunking plugin
      const { gzipSync, strToU8 } = await import(/* webpackChunkName: "compressor" */'fflate')
      gzipper = gzipSync
      u8 = strToU8
    } catch (err) {
      // compressor failed to load, but we can still record without compression as a last ditch effort
      this.shouldCompress = false
    }
    this.startRecording()

    this.syncWithSessionManager({ sessionReplayMode: this.mode })
  }

  prepareHarvest () {
    if (this.events.length === 0 || (this.mode !== MODE.FULL && !this.blocked)) return
    const payload = this.getHarvestContents()
    if (!payload.body.length) {
      this.clearBuffer()
      return
    }
    if (this.shouldCompress) {
      payload.body = gzipper(u8(stringify(payload.body)))
      this.scheduler.opts.gzip = true
    } else {
      this.scheduler.opts.gzip = false
    }
    // TODO -- Gracefully handle the buffer for retries.
    const { session } = getRuntime(this.agentIdentifier)
    if (!session.state.sessionReplaySentFirstChunk) this.syncWithSessionManager({ sessionReplaySentFirstChunk: true })
    this.clearBuffer()
    return [payload]
  }

  getHarvestContents () {
    const agentRuntime = getRuntime(this.agentIdentifier)
    const info = getInfo(this.agentIdentifier)
    const endUserId = info.jsAttributes?.['enduser.id']

    if (this.backloggedEvents.length) this.events = [...this.backloggedEvents, ...this.events]

    // do not let the first node be a full snapshot node, since this NEEDS to be preceded by a meta node
    // we will manually inject it if this happens
    const payloadStartsWithFullSnapshot = this.events[0]?.type === RRWEB_EVENT_TYPES.FullSnapshot
    if (payloadStartsWithFullSnapshot && !!this.lastMeta) {
      this.hasMeta = true
      this.events.unshift(this.lastMeta) // --> pushed the meta from a previous payload into newer payload... but it still has old timestamps
      this.lastMeta = undefined
    }

    // do not let the last node be a meta node, since this NEEDS to precede a snapshot
    // we will manually inject it later if we find a payload that is missing a meta node
    const payloadEndsWithMeta = this.events[this.events.length - 1]?.type === RRWEB_EVENT_TYPES.Meta
    if (payloadEndsWithMeta) {
      this.lastMeta = this.events[this.events.length - 1]
      this.events = this.events.slice(0, this.events.length - 1)
      this.hasMeta = !!this.events.find(x => x.type === RRWEB_EVENT_TYPES.Meta)
    }

    const agentOffset = getRuntime(this.agentIdentifier).offset
    const relativeNow = now()

    const firstEventTimestamp = this.events[0]?.timestamp // from rrweb node
    const lastEventTimestamp = this.events[this.events.length - 1]?.timestamp // from rrweb node
    const firstTimestamp = firstEventTimestamp || this.cycleTimestamp
    const lastTimestamp = lastEventTimestamp || agentOffset + relativeNow
    return {
      qs: {
        browser_monitoring_key: info.licenseKey,
        type: 'SessionReplay',
        app_id: info.applicationID,
        protocol_version: '0',
        attributes: encodeObj({
          // this section of attributes must be controllable and stay below the query param padding limit -- see QUERY_PARAM_PADDING
          // if not, data could be lost to truncation at time of sending, potentially breaking parsing / API behavior in NR1
          ...(this.shouldCompress && { content_encoding: 'gzip' }),
          'replay.firstTimestamp': firstTimestamp,
          'replay.firstTimestampOffset': firstTimestamp - agentOffset,
          'replay.lastTimestamp': lastTimestamp,
          'replay.durationMs': lastTimestamp - firstTimestamp,
          'replay.nodes': this.events.length,
          'session.durationMs': agentRuntime.session.getDuration(),
          agentVersion: agentRuntime.version,
          session: agentRuntime.session.state.value,
          rst: relativeNow,
          hasMeta: this.hasMeta,
          hasSnapshot: this.hasSnapshot,
          hasError: this.hasError,
          isFirstChunk: agentRuntime.session.state.sessionReplaySentFirstChunk === false,
          decompressedBytes: this.payloadBytesEstimation,
          'rrweb.version': RRWEB_VERSION,
          // customer-defined data should go last so that if it exceeds the query param padding limit it will be truncated instead of important attrs
          ...(endUserId && { 'enduser.id': endUserId })
          // The Query Param is being arbitrarily limited in length here.  It is also applied when estimating the size of the payload in getPayloadSize()
        }, QUERY_PARAM_PADDING).substring(1) // remove the leading '&'
      },
      body: this.events
    }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      this.abort(ABORT_REASONS.TOO_MANY)
    }

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  /** Clears the buffer (this.events), and resets all payload metadata properties */
  clearBuffer () {
    if (this.mode === MODE.ERROR) this.backloggedEvents = this.events
    else this.backloggedEvents = []
    this.events = []
    this.hasSnapshot = false
    this.hasMeta = false
    this.hasError = false
    this.payloadBytesEstimation = 0
    this.clearTimestamps()
  }

  /** Begin recording using configured recording lib */
  startRecording () {
    if (!recorder) {
      warn('Recording library was never imported')
      return this.abort(ABORT_REASONS.IMPORT)
    }
    this.recording = true
    const { block_class, ignore_class, mask_text_class, block_selector, mask_input_options, mask_text_selector, mask_all_inputs, inline_images, inline_stylesheet, collect_fonts } = getConfigurationValue(this.agentIdentifier, 'session_replay')
    // set up rrweb configurations for maximum privacy --
    // https://newrelic.atlassian.net/wiki/spaces/O11Y/pages/2792293280/2023+02+28+Browser+-+Session+Replay#Configuration-options
    const stop = recorder({
      emit: this.store.bind(this),
      blockClass: block_class,
      ignoreClass: ignore_class,
      maskTextClass: mask_text_class,
      blockSelector: block_selector,
      maskInputOptions: mask_input_options,
      maskTextSelector: mask_text_selector,
      maskAllInputs: mask_all_inputs,
      inlineImages: inline_images,
      inlineStylesheet: inline_stylesheet,
      collectFonts: collect_fonts,
      checkoutEveryNms: CHECKOUT_MS[this.mode]
    })

    this.stopRecording = () => {
      this.recording = false
      stop()
    }
  }

  /** Store a payload in the buffer (this.events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    this.setTimestamps()
    if (this.blocked) return
    const eventBytes = stringify(event).length
    /** The estimated size of the payload after compression */
    const payloadSize = this.getPayloadSize(eventBytes)
    // Vortex will block payloads at a certain size, we might as well not send.
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      this.clearBuffer()
      return this.abort(ABORT_REASONS.TOO_BIG)
    }
    // Checkout events are flags by the recording lib that indicate a fullsnapshot was taken every n ms. These are important
    // to help reconstruct the replay later and must be included.  While waiting and buffering for errors to come through,
    // each time we see a new checkout, we can drop the old data.
    // we need to check for meta because rrweb will flag it as checkout twice, once for meta, then once for snapshot
    if (this.mode === MODE.ERROR && isCheckout && event.type === RRWEB_EVENT_TYPES.Meta) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    // meta event
    if (event.type === RRWEB_EVENT_TYPES.Meta) {
      this.hasMeta = true
    }
    // snapshot event
    if (event.type === RRWEB_EVENT_TYPES.FullSnapshot) {
      this.hasSnapshot = true
    }

    this.events.push(event)
    this.payloadBytesEstimation += eventBytes

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (payloadSize > IDEAL_PAYLOAD_SIZE && this.mode !== MODE.ERROR) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    if (!recorder) return
    recorder.takeFullSnapshot()
  }

  setTimestamps () {
    // fallbacks if timestamps cannot be derived from rrweb events
    if (!this.cycleTimestamp) this.cycleTimestamp = getRuntime(this.agentIdentifier).offset + globalScope.performance.now()
  }

  clearTimestamps () {
    this.cycleTimestamp = undefined
  }

  /** Estimate the payload size */
  getPayloadSize (newBytes = 0) {
    // the query param padding constant gives us some padding for the other metadata to be safely injected
    return this.estimateCompression(this.payloadBytesEstimation + newBytes) + QUERY_PARAM_PADDING
  }

  /**
   * Forces the agent into OFF mode so that changing tabs or navigating
   * does not restart the recording. This is used when the customer calls
   * the stopRecording API.
   */
  forceStop (forceHarvest) {
    if (forceHarvest) this.scheduler.runHarvest()
    this.mode = MODE.OFF
    this.stopRecording()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
  }

  /** Abort the feature, once aborted it will not resume */
  abort (reason = {}) {
    warn(`SR aborted -- ${reason.message}`)
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`SessionReplay/Abort/${reason.sm}`], undefined, FEATURE_NAMES.metrics, this.ee)
    this.blocked = true
    this.mode = MODE.OFF
    this.stopRecording()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
    this.clearTimestamps()
    this.ee.emit('REPLAY_ABORTED')
  }

  /** Extensive research has yielded about an 88% compression factor on these payloads.
   * This is an estimation using that factor as to not cause performance issues while evaluating
   * https://staging.onenr.io/037jbJWxbjy
   * */
  estimateCompression (data) {
    if (this.shouldCompress) return data * AVG_COMPRESSION
    return data
  }

  syncWithSessionManager (state = {}) {
    const { session } = getRuntime(this.agentIdentifier)
    session.write(state)
  }
}
