/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Records, aggregates, and harvests session replay data.
 */

import { registerHandler } from '../../../common/event-emitter/register-handler'
import { ABORT_REASONS, FEATURE_NAME, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES, SR_EVENT_EMITTER_TYPES, TRIGGERS } from '../constants'
import { AggregateBase } from '../../utils/aggregate-base'
import { sharedChannel } from '../../../common/constants/shared-channel'
import { obj as encodeObj } from '../../../common/url/encode'
import { warn } from '../../../common/util/console'
import { globalScope } from '../../../common/constants/runtime'
import { RRWEB_VERSION } from '../../../common/constants/env'
import { MODE, SESSION_EVENTS, SESSION_EVENT_TYPES } from '../../../common/session/constants'
import { stringify } from '../../../common/util/stringify'
import { stylesheetEvaluator } from '../shared/stylesheet-evaluator'
import { now } from '../../../common/timing/now'
import { buildNRMetaNode } from '../shared/utils'
import { MAX_PAYLOAD_SIZE } from '../../../common/constants/agent-constants'
import { cleanURL } from '../../../common/url/clean-url'
import { canEnableSessionTracking } from '../../utils/feature-gates'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  mode = MODE.OFF

  // pass the recorder into the aggregator
  constructor (agentRef, args) {
    super(agentRef, FEATURE_NAME)
    /** Set once the recorder has fully initialized after flag checks and sampling */
    this.initialized = false
    /** Set once the feature has been "aborted" to prevent other side-effects from continuing */
    this.blocked = false
    /** populated with the gzipper lib async */
    this.gzipper = undefined
    /** populated with the u8 string lib async */
    this.u8 = undefined

    /** set by BCS response */
    this.entitled = false
    /** set at BCS response, stored in runtime */
    this.timeKeeper = undefined

    this.recorder = args?.recorder
    this.errorNoticed = args?.errorNoticed || false
    this.harvestOpts.raw = true

    this.isSessionTrackingEnabled = canEnableSessionTracking(this.agentIdentifier) && this.agentRef.runtime.session

    this.reportSupportabilityMetric('Config/SessionReplay/Enabled')

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.abort(ABORT_REASONS.RESET)
    })

    // The SessionEntity class can emit a message indicating the session was paused (visibility change). This feature must stop recording if that occurs.
    this.ee.on(SESSION_EVENTS.PAUSE, () => { this.recorder?.stopRecording() })
    // The SessionEntity class can emit a message indicating the session was resumed (visibility change). This feature must start running again (if already running) if that occurs.
    this.ee.on(SESSION_EVENTS.RESUME, () => {
      if (!this.recorder) return
      // if the mode changed on a different tab, it needs to update this instance to match
      this.mode = agentRef.runtime.session.state.sessionReplayMode
      if (!this.initialized || this.mode === MODE.OFF) return
      this.recorder?.startRecording()
    })

    this.ee.on(SESSION_EVENTS.UPDATE, (type, data) => {
      if (!this.recorder || !this.initialized || this.blocked || type !== SESSION_EVENT_TYPES.CROSS_TAB) return
      if (this.mode !== MODE.OFF && data.sessionReplayMode === MODE.OFF) this.abort(ABORT_REASONS.CROSS_TAB)
      this.mode = data.sessionReplayMode
    })

    registerHandler(SR_EVENT_EMITTER_TYPES.PAUSE, () => {
      this.forceStop(this.mode === MODE.FULL)
    }, this.featureName, this.ee)

    registerHandler(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, e => {
      this.handleError(e)
    }, this.featureName, this.ee)

    const { error_sampling_rate, sampling_rate, autoStart, block_selector, mask_text_selector, mask_all_inputs, inline_images, collect_fonts } = agentRef.init.session_replay

    this.waitForFlags(['srs', 'sr']).then(([srMode, entitled]) => {
      this.entitled = !!entitled
      if (!this.entitled) {
        this.deregisterDrain()
        if (this.recorder?.recording) {
          this.abort(ABORT_REASONS.ENTITLEMENTS)
          this.reportSupportabilityMetric('SessionReplay/EnabledNotEntitled/Detected')
        }
        return
      }
      this.drain()
      this.initializeRecording(srMode)
    }).then(() => {
      if (this.mode === MODE.OFF) {
        this.recorder?.stopRecording() // stop any conservative preload recording launched by instrument
        while (this.recorder?.getEvents().events.length) this.recorder?.clearBuffer?.()
      }
      sharedChannel.onReplayReady(this.mode)
    }) // notify watchers that replay started with the mode

    /** Detect if the default configs have been altered and report a SM.  This is useful to evaluate what the reasonable defaults are across a customer base over time */
    if (!autoStart) this.reportSupportabilityMetric('Config/SessionReplay/AutoStart/Modified')
    if (collect_fonts === true) this.reportSupportabilityMetric('Config/SessionReplay/CollectFonts/Modified')
    if (inline_images === true) this.reportSupportabilityMetric('Config/SessionReplay/InlineImages/Modifed')
    if (mask_all_inputs !== true) this.reportSupportabilityMetric('Config/SessionReplay/MaskAllInputs/Modified')
    if (block_selector !== '[data-nr-block]') this.reportSupportabilityMetric('Config/SessionReplay/BlockSelector/Modified')
    if (mask_text_selector !== '*') this.reportSupportabilityMetric('Config/SessionReplay/MaskTextSelector/Modified')

    this.reportSupportabilityMetric('Config/SessionReplay/SamplingRate/Value', sampling_rate)
    this.reportSupportabilityMetric('Config/SessionReplay/ErrorSamplingRate/Value', error_sampling_rate)
  }

  replayIsActive () {
    return Boolean(this.recorder && this.mode === MODE.FULL && !this.blocked && this.entitled)
  }

  handleError (e) {
    if (this.recorder) this.recorder.currentBufferTarget.hasError = true
    // run once
    if (this.mode === MODE.ERROR && globalScope?.document.visibilityState === 'visible') {
      this.switchToFull()
    }
  }

  switchToFull () {
    if (!this.entitled || this.blocked) return
    this.mode = MODE.FULL
    // if the error was noticed AFTER the recorder was already imported....
    if (this.recorder && this.initialized) {
      if (!this.recorder.recording) this.recorder.startRecording()
      this.syncWithSessionManager({ sessionReplayMode: this.mode })
    } else {
      this.initializeRecording(MODE.FULL, true)
    }
  }

  /**
   * Evaluate entitlements and sampling before starting feature mechanics, importing and configuring recording library, and setting storage state
   * @param {boolean} srMode - the true/false state of the "sr" flag (aka. entitlements) from RUM response
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
    const { session, timeKeeper } = this.agentRef.runtime
    this.timeKeeper = timeKeeper
    if (this.recorder?.parent.trigger === TRIGGERS.API && this.recorder?.recording) {
      this.mode = MODE.FULL
    } else if (!session.isNew && !ignoreSession) { // inherit the mode of the existing session
      this.mode = session.state.sessionReplayMode
    } else {
      // The session is new... determine the mode the new session should start in
      this.mode = srMode
    }
    // If off, then don't record (early return)
    if (this.mode === MODE.OFF) return

    if (!this.recorder) {
      try {
      // Do not change the webpackChunkName or it will break the webpack nrba-chunking plugin
        const { Recorder } = (await import(/* webpackChunkName: "recorder" */'../shared/recorder'))
        this.recorder = new Recorder(this)
        this.recorder.currentBufferTarget.hasError = this.errorNoticed
      } catch (err) {
        return this.abort(ABORT_REASONS.IMPORT)
      }
    } else {
      this.recorder.parent = this
    }

    // If an error was noticed before the mode could be set (like in the early lifecycle of the page), immediately set to FULL mode
    if (this.mode === MODE.ERROR && this.errorNoticed) this.mode = MODE.FULL

    // FULL mode records AND reports from the beginning, while ERROR mode only records (but does not report).
    // ERROR mode will do this until an error is thrown, and then switch into FULL mode.
    // The makeHarvestPayload should ensure that no payload is returned if we're not in FULL mode...

    // If theres preloaded events and we are in full mode, just harvest immediately to clear up space and for consistency
    if (this.mode === MODE.FULL && this.recorder?.getEvents().type === 'preloaded') {
      this.prepUtils().then(() => this.agentRef.runtime.harvester.triggerHarvestFor(this))
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

  makeHarvestPayload (shouldRetryOnFail) {
    const payloadOutput = { targetApp: undefined, payload: undefined }
    if (this.mode !== MODE.FULL || this.blocked) return
    if (!this.recorder || !this.timeKeeper?.ready || !this.recorder.hasSeenSnapshot) return

    const recorderEvents = this.recorder.getEvents()
    // get the event type and use that to trigger another harvest if needed
    if (!recorderEvents.events.length || (this.mode !== MODE.FULL) || this.blocked) return

    const payload = this.getHarvestContents(recorderEvents)
    if (!payload.body.length) {
      this.recorder.clearBuffer()
      return [payloadOutput]
    }

    this.reportSupportabilityMetric('SessionReplay/Harvest/Attempts')

    let len = 0
    if (!!this.gzipper && !!this.u8) {
      payload.body = this.gzipper(this.u8(`[${payload.body.map(({ __serialized, ...e }) => {
        if (e.__newrelic && __serialized) return __serialized
        const output = { ...e }
        if (!output.__newrelic) {
          output.__newrelic = buildNRMetaNode(e.timestamp, this.timeKeeper)
          output.timestamp = this.timeKeeper.correctAbsoluteTimestamp(e.timestamp)
        }
        return stringify(output)
      }).join(',')}]`))
      len = payload.body.length
    } else {
      payload.body = payload.body.map(({ __serialized, ...node }) => {
        if (node.__newrelic) return node
        const output = { ...node }
        output.__newrelic = buildNRMetaNode(node.timestamp, this.timeKeeper)
        output.timestamp = this.timeKeeper.correctAbsoluteTimestamp(node.timestamp)
        return output
      })
      len = stringify(payload.body).length
    }

    if (len > MAX_PAYLOAD_SIZE) {
      this.abort(ABORT_REASONS.TOO_BIG, len)
      return [payloadOutput]
    }
    // TODO -- Gracefully handle the buffer for retries.
    if (!this.agentRef.runtime.session.state.sessionReplaySentFirstChunk) this.syncWithSessionManager({ sessionReplaySentFirstChunk: true })
    this.recorder.clearBuffer()
    if (recorderEvents.type === 'preloaded') this.agentRef.runtime.harvester.triggerHarvestFor(this)
    payloadOutput.payload = payload

    return [payloadOutput]
  }

  getCorrectedTimestamp (node) {
    if (!node?.timestamp) return
    if (node.__newrelic) return node.timestamp
    return this.timeKeeper.correctAbsoluteTimestamp(node.timestamp)
  }

  getHarvestContents (recorderEvents) {
    recorderEvents ??= this.recorder.getEvents()
    let events = recorderEvents.events
    const agentRuntime = this.agentRef.runtime
    const endUserId = this.agentRef.info.jsAttributes?.['enduser.id']

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

    const relativeNow = now()

    const firstEventTimestamp = this.getCorrectedTimestamp(events[0]) // from rrweb node
    const lastEventTimestamp = this.getCorrectedTimestamp(events[events.length - 1]) // from rrweb node
    // from rrweb node || from when the harvest cycle started
    const firstTimestamp = firstEventTimestamp || Math.floor(this.timeKeeper.correctAbsoluteTimestamp(recorderEvents.cycleTimestamp))
    const lastTimestamp = lastEventTimestamp || Math.floor(this.timeKeeper.correctRelativeTimestamp(relativeNow))

    const agentMetadata = agentRuntime.appMetadata?.agents?.[0] || {}

    return {
      qs: {
        browser_monitoring_key: this.agentRef.info.licenseKey,
        type: 'SessionReplay',
        app_id: this.agentRef.info.applicationID,
        protocol_version: '0',
        timestamp: firstTimestamp,
        attributes: encodeObj({
          // this section of attributes must be controllable and stay below the query param padding limit -- see QUERY_PARAM_PADDING
          // if not, data could be lost to truncation at time of sending, potentially breaking parsing / API behavior in NR1
          ...(!!this.gzipper && !!this.u8 && { content_encoding: 'gzip' }),
          ...(agentMetadata.entityGuid && { entityGuid: agentMetadata.entityGuid }),
          harvestId: [agentRuntime.session?.state.value, agentRuntime.ptid, agentRuntime.harvestCount].filter(x => x).join('_'),
          'replay.firstTimestamp': firstTimestamp,
          'replay.lastTimestamp': lastTimestamp,
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
          'payload.type': recorderEvents.type,
          // customer-defined data should go last so that if it exceeds the query param padding limit it will be truncated instead of important attrs
          ...(endUserId && { 'enduser.id': this.obfuscator.obfuscateString(endUserId) }),
          currentUrl: this.obfuscator.obfuscateString(cleanURL('' + location))
          // The Query Param is being arbitrarily limited in length here.  It is also applied when estimating the size of the payload in getPayloadSize()
        }, QUERY_PARAM_PADDING).substring(1) // remove the leading '&'
      },
      body: events
    }
  }

  postHarvestCleanup (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      this.abort(ABORT_REASONS.TOO_MANY)
    }
  }

  /**
   * Forces the agent into OFF mode so that changing tabs or navigating
   * does not restart the recording. This is used when the customer calls
   * the stopRecording API.
   */
  forceStop (forceHarvest) {
    if (forceHarvest) this.agentRef.runtime.harvester.triggerHarvestFor(this)
    this.mode = MODE.OFF
    this.recorder?.stopRecording?.()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
  }

  /** Abort the feature, once aborted it will not resume */
  abort (reason = {}, data) {
    warn(33, reason.message)
    this.reportSupportabilityMetric(`SessionReplay/Abort/${reason.sm}`, data)
    this.blocked = true
    this.mode = MODE.OFF
    this.recorder?.stopRecording?.()
    this.syncWithSessionManager({ sessionReplayMode: this.mode })
    this.recorder?.clearTimestamps?.()
    while (this.recorder?.getEvents().events.length) this.recorder?.clearBuffer?.()
  }

  syncWithSessionManager (state = {}) {
    if (this.isSessionTrackingEnabled) {
      this.agentRef.runtime.session.write(state)
    }
  }
}
