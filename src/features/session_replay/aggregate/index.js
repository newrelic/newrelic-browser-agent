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
import { ABORT_REASONS, FEATURE_NAME, MAX_PAYLOAD_SIZE, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES, SR_EVENT_EMITTER_TYPES } from '../constants'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
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
import { MODE, SESSION_EVENTS, SESSION_EVENT_TYPES } from '../../../common/session/constants'
import { stringify } from '../../../common/util/stringify'
import { stylesheetEvaluator } from '../shared/stylesheet-evaluator'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  // pass the recorder into the aggregator
  constructor (agentIdentifier, aggregator, args) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    /** The interval to harvest at.  This gets overridden if the size of the payload exceeds certain thresholds */
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'session_replay.harvestTimeSeconds') || 60
    /** Set once the recorder has fully initialized after flag checks and sampling */
    this.initialized = false
    /** Set once the feature has been "aborted" to prevent other side-effects from continuing */
    this.blocked = false
    /** populated with the gzipper lib async */
    this.gzipper = undefined
    /** populated with the u8 string lib async */
    this.u8 = undefined
    /** the mode to start in.  Defaults to off */
    const { session } = getRuntime(this.agentIdentifier)
    this.mode = session.state.sessionReplayMode || MODE.OFF

    /** set by BCS response */
    this.entitled = false

    this.recorder = args?.recorder
    if (this.recorder) this.recorder.parent = this

    handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/Enabled'], undefined, FEATURE_NAMES.metrics, this.ee)

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.scheduler.runHarvest()
      this.abort(ABORT_REASONS.RESET)
    })

    // The SessionEntity class can emit a message indicating the session was paused (visibility change). This feature must stop recording if that occurs.
    this.ee.on(SESSION_EVENTS.PAUSE, () => { this.recorder?.stopRecording() })
    // The SessionEntity class can emit a message indicating the session was resumed (visibility change). This feature must start running again (if already running) if that occurs.
    this.ee.on(SESSION_EVENTS.RESUME, () => {
      if (!this.recorder) return
      // if the mode changed on a different tab, it needs to update this instance to match
      const { session } = getRuntime(this.agentIdentifier)
      this.mode = session.state.sessionReplayMode
      if (!this.initialized || this.mode === MODE.OFF) return
      this.recorder?.startRecording()
    })

    this.ee.on(SESSION_EVENTS.UPDATE, (type, data) => {
      if (!this.recorder || !this.initialized || this.blocked || type !== SESSION_EVENT_TYPES.CROSS_TAB) return
      if (this.mode !== MODE.OFF && data.sessionReplayMode === MODE.OFF) this.abort(ABORT_REASONS.CROSS_TAB)
      this.mode = data.sessionReplay
    })

    // Bespoke logic for blobs endpoint.
    this.scheduler = new HarvestScheduler('browser/blobs', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this),
      raw: true
    }, this)

    registerHandler(SR_EVENT_EMITTER_TYPES.PAUSE, () => {
      this.forceStop(this.mode !== MODE.ERROR)
    }, this.featureName, this.ee)

    // Wait for an error to be reported.  This currently is wrapped around the "Error" feature.  This is a feature-feature dependency.
    // This was to ensure that all errors, including those on the page before load and those handled with "noticeError" are accounted for. Needs evalulation
    registerHandler('sr-errorAgg', (e) => {
      this.errorNoticed = true
      if (this.recorder) this.recorder.currentBufferTarget.hasError = true
      // run once
      if (this.mode === MODE.ERROR && globalScope?.document.visibilityState === 'visible') {
        this.switchToFull()
      }
    }, this.featureName, this.ee)

    const { error_sampling_rate, sampling_rate, autoStart, block_selector, mask_text_selector, mask_all_inputs, inline_stylesheet, inline_images, collect_fonts } = getConfigurationValue(this.agentIdentifier, 'session_replay')

    this.waitForFlags(['srs', 'sr']).then(([srMode, entitled]) => {
      // waitForFlags now returns the raw value (0, 1) of the flag.
      // Eventually BCS will report this as (0, 1, 2) for the appropriate mode, and report entitlements separately.
      // This will need to be fixed to honor that when that change is made. Returning the raw flag value enables that work.
      this.entitled = !!entitled
      if (!this.entitled && this.recorder?.recording) {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['SessionReplay/EnabledNotEntitled/Detected'], undefined, FEATURE_NAMES.metrics, this.ee)
        this.recorder?.abort(ABORT_REASONS.ENTITLEMENTS)
        return
      }
      this.initializeRecording(srMode)
    }).then(() => {
      if (this.mode === MODE.OFF) this.recorder?.stopRecording() // stop any conservative preload recording launched by instrument
      sharedChannel.onReplayReady(this.mode)
    }) // notify watchers that replay started with the mode

    /** Detect if the default configs have been altered and report a SM.  This is useful to evaluate what the reasonable defaults are across a customer base over time */
    if (!autoStart) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/AutoStart/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (collect_fonts === true) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/CollectFonts/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (inline_stylesheet !== true) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/InlineStylesheet/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (inline_images === true) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/InlineImages/Modifed'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (mask_all_inputs !== true) handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/MaskAllInputs/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (block_selector !== '[data-nr-block]') handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/BlockSelector/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)
    if (mask_text_selector !== '*') handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/MaskTextSelector/Modified'], undefined, FEATURE_NAMES.metrics, this.ee)

    handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/SamplingRate/Value', sampling_rate], undefined, FEATURE_NAMES.metrics, this.ee)
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['Config/SessionReplay/ErrorSamplingRate/Value', error_sampling_rate], undefined, FEATURE_NAMES.metrics, this.ee)

    this.drain()
  }

  switchToFull () {
    this.mode = MODE.FULL
    // if the error was noticed AFTER the recorder was already imported....
    if (this.recorder && this.initialized) {
      this.recorder.stopRecording()
      this.recorder.startRecording()

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
  async initializeRecording (srMode, ignoreSession) {
    this.initialized = true
    if (!this.entitled) return

    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    // if this isnt the FIRST load of a session AND
    // we are not actively recording SR... DO NOT import or run the recording library
    // session replay samples can only be decided on the first load of a session
    // session replays can continue if already in progress
    const { session } = getRuntime(this.agentIdentifier)
    if (!session.isNew && !ignoreSession) { // inherit the mode of the existing session
      this.mode = session.state.sessionReplayMode
    } else {
      // The session is new... determine the mode the new session should start in
      this.mode = srMode
      // If off, then don't record (early return)
      if (this.mode === MODE.OFF) return
    }

    if (this.recorder?.getEvents().type === 'preloaded') {
      this.prepUtils().then(() => {
        this.scheduler.runHarvest()
      })
    }

    if (!this.recorder) {
      try {
      // Do not change the webpackChunkName or it will break the webpack nrba-chunking plugin
        const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))
        this.recorder = new Recorder(this)
        this.recorder.currentBufferTarget.hasError = this.errorNoticed
      } catch (err) {
        return this.abort(ABORT_REASONS.IMPORT)
      }
    }

    // If an error was noticed before the mode could be set (like in the early lifecycle of the page), immediately set to FULL mode
    if (this.mode === MODE.ERROR && this.errorNoticed) {
      this.mode = MODE.FULL
    }

    // FULL mode records AND reports from the beginning, while ERROR mode only records (but does not report).
    // ERROR mode will do this until an error is thrown, and then switch into FULL mode.
    // If an error happened in ERROR mode before we've gotten to this stage, it will have already set the mode to FULL
    if (this.mode === MODE.FULL && !this.scheduler.started) {
      // We only report (harvest) in FULL mode
      this.scheduler.startTimer(this.harvestTimeSeconds)
    }

    await this.prepUtils()

    if (!this.recorder.recording) this.recorder.startRecording()

    this.syncWithSessionManager({ sessionReplayMode: this.mode })
  }

  async prepUtils () {
    try {
      // Do not change the webpackChunkName or it will break the webpack nrba-chunking plugin
      const { gzipSync, strToU8 } = await import(/* webpackChunkName: "compressor" */'fflate')
      this.gzipper = gzipSync
      this.u8 = strToU8
    } catch (err) {
      // compressor failed to load, but we can still record without compression as a last ditch effort
    }
  }

  prepareHarvest ({ opts } = {}) {
    if (!this.recorder) return
    const recorderEvents = this.recorder.getEvents()
    // get the event type and use that to trigger another harvest if needed
    if (!recorderEvents.events.length || (this.mode !== MODE.FULL) || this.blocked) return

    const payload = this.getHarvestContents(recorderEvents)
    if (!payload.body.length) {
      this.recorder.clearBuffer()
      return
    }

    let len = 0
    if (!!this.gzipper && !!this.u8) {
      payload.body = this.gzipper(this.u8(`[${payload.body.map(e => e.__serialized).join(',')}]`))
      len = payload.body.length
      this.scheduler.opts.gzip = true
    } else {
      payload.body = payload.body.map(({ __serialized, ...node }) => node)
      len = stringify(payload.body).length
      this.scheduler.opts.gzip = false
    }

    if (len > MAX_PAYLOAD_SIZE) {
      this.abort(ABORT_REASONS.TOO_BIG)
      return
    }
    // TODO -- Gracefully handle the buffer for retries.
    const { session } = getRuntime(this.agentIdentifier)
    if (!session.state.sessionReplaySentFirstChunk) this.syncWithSessionManager({ sessionReplaySentFirstChunk: true })
    this.recorder.clearBuffer()
    if (recorderEvents.type === 'preloaded') this.scheduler.runHarvest(opts)
    return [payload]
  }

  getHarvestContents (recorderEvents) {
    recorderEvents ??= this.recorder.getEvents()
    let events = recorderEvents.events
    const agentRuntime = getRuntime(this.agentIdentifier)
    const info = getInfo(this.agentIdentifier)
    const endUserId = info.jsAttributes?.['enduser.id']

    // do not let the first node be a full snapshot node, since this NEEDS to be preceded by a meta node
    // we will manually inject it if this happens
    const payloadStartsWithFullSnapshot = events?.[0]?.type === RRWEB_EVENT_TYPES.FullSnapshot
    if (payloadStartsWithFullSnapshot && !!this.recorder.lastMeta) {
      recorderEvents.hasMeta = true
      events.unshift(this.recorder.lastMeta) // --> pushed the meta from a previous payload into newer payload... but it still has old timestamps
      this.recorder.lastMeta = undefined
    }

    // do not let the last node be a meta node, since this NEEDS to precede a snapshot
    // we will manually inject it later if we find a payload that is missing a meta node
    const payloadEndsWithMeta = events[events.length - 1]?.type === RRWEB_EVENT_TYPES.Meta
    if (payloadEndsWithMeta) {
      this.recorder.lastMeta = events[events.length - 1]
      events = events.slice(0, events.length - 1)
      recorderEvents.hasMeta = !!events.find(x => x.type === RRWEB_EVENT_TYPES.Meta)
    }

    const agentOffset = getRuntime(this.agentIdentifier).offset
    const relativeNow = now()

    const firstEventTimestamp = events[0]?.timestamp // from rrweb node
    const lastEventTimestamp = events[events.length - 1]?.timestamp // from rrweb node
    const firstTimestamp = firstEventTimestamp || recorderEvents.cycleTimestamp // from rrweb node || from when the harvest cycle started
    const lastTimestamp = lastEventTimestamp || agentOffset + relativeNow

    const agentMetadata = agentRuntime.appMetadata?.agents?.[0] || {}
    return {
      qs: {
        browser_monitoring_key: info.licenseKey,
        type: 'SessionReplay',
        app_id: info.applicationID,
        protocol_version: '0',
        attributes: encodeObj({
          // this section of attributes must be controllable and stay below the query param padding limit -- see QUERY_PARAM_PADDING
          // if not, data could be lost to truncation at time of sending, potentially breaking parsing / API behavior in NR1
          ...(!!this.gzipper && !!this.u8 && { content_encoding: 'gzip' }),
          ...(agentMetadata.entityGuid && { entityGuid: agentMetadata.entityGuid }),
          'replay.firstTimestamp': firstTimestamp,
          'replay.firstTimestampOffset': firstTimestamp - agentOffset,
          'replay.lastTimestamp': lastTimestamp,
          'replay.durationMs': lastTimestamp - firstTimestamp,
          'replay.nodes': events.length,
          'session.durationMs': agentRuntime.session.getDuration(),
          agentVersion: agentRuntime.version,
          session: agentRuntime.session.state.value,
          rst: relativeNow,
          hasMeta: recorderEvents.hasMeta || false,
          hasSnapshot: recorderEvents.hasSnapshot || false,
          hasError: recorderEvents.hasError || false,
          isFirstChunk: agentRuntime.session.state.sessionReplaySentFirstChunk === false,
          decompressedBytes: recorderEvents.payloadBytesEstimation,
          invalidStylesheetsDetected: stylesheetEvaluator.invalidStylesheetsDetected,
          inlinedAllStylesheets: recorderEvents.inlinedAllStylesheets,
          'rrweb.version': RRWEB_VERSION,
          // customer-defined data should go last so that if it exceeds the query param padding limit it will be truncated instead of important attrs
          ...(endUserId && { 'enduser.id': endUserId })
          // The Query Param is being arbitrarily limited in length here.  It is also applied when estimating the size of the payload in getPayloadSize()
        }, QUERY_PARAM_PADDING).substring(1) // remove the leading '&'
      },
      body: events
    }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      this.abort(ABORT_REASONS.TOO_MANY)
    }

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  /**
   * Forces the agent into OFF mode so that changing tabs or navigating
   * does not restart the recording. This is used when the customer calls
   * the stopRecording API.
   */
  forceStop (forceHarvest) {
    if (forceHarvest) this.scheduler.runHarvest()
    this.mode = MODE.OFF
    this.recorder?.stopRecording?.()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
  }

  /** Abort the feature, once aborted it will not resume */
  abort (reason = {}) {
    warn(`SR aborted -- ${reason.message}`)
    handle(SUPPORTABILITY_METRIC_CHANNEL, [`SessionReplay/Abort/${reason.sm}`], undefined, FEATURE_NAMES.metrics, this.ee)
    this.blocked = true
    this.mode = MODE.OFF
    this.recorder?.stopRecording?.()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
    this.recorder?.clearTimestamps?.()
    this.ee.emit('REPLAY_ABORTED')
    while (this.recorder?.getEvents().events.length) this.recorder?.clearBuffer?.()
  }

  syncWithSessionManager (state = {}) {
    const { session } = getRuntime(this.agentIdentifier)
    session.write(state)
  }
}
