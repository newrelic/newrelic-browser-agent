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

import { drain } from '../../../common/drain/drain'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { HarvestScheduler } from '../../../common/harvest/harvest-scheduler'
import { FEATURE_NAME } from '../constants'
import { stringify } from '../../../common/util/stringify'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { SESSION_EVENTS, MODE } from '../../../common/session/session-entity'
import { AggregateBase } from '../../utils/aggregate-base'
import { sharedChannel } from '../../../common/constants/shared-channel'

// would be better to get this dynamically in some way
export const RRWEB_VERSION = '2.0.0-alpha.8'

let recorder, gzipper, u8

/** Vortex caps payload sizes at 1MB */
const MAX_PAYLOAD_SIZE = 1000000
/** Unloading caps around 64kb */
const IDEAL_PAYLOAD_SIZE = 64000
/** Interval between forcing new full snapshots in "error" mode */
const CHECKOUT_MS = 30000

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
    this.events = []
    /** The interval to harvest at.  This gets overridden if the size of the payload exceeds certain thresholds */
    this.harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'session_replay.harvestTimeSeconds') || 60
    /** Set once the recorder has fully initialized after flag checks and sampling */
    this.initialized = false
    /** Set once an error has been detected on the page. */
    this.errorNoticed = false
    /** The "mode" to record in.  Defaults to "OFF" until flags and sampling are checked. See "MODE" constant. */
    this.mode = MODE.OFF
    /** Set once the feature has been "aborted" to prevent other side-effects from continuing */
    this.blocked = false

    /** Payload metadata -- Should indicate that the payload being sent is the first of a session */
    this.isFirstChunk = false
    /** Payload metadata -- Should indicate that the payload being sent has a full DOM snapshot. This can happen
     * -- When the recording library begins recording, it starts by taking a DOM snapshot
     * -- When visibility changes from "hidden" -> "visible", it must capture a full snapshot for the replay to work correctly across tabs
    */
    this.hasSnapshot = false
    /** Payload metadata -- Should indicate that the payload being sent contains an error.  Used for query/filter purposes in UI */
    this.hasError = false

    /** A value which increments with every new mutation node reported. Resets after a harvest is sent */
    this.payloadBytesEstimation = 0

    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }

    // The SessionEntity class can emit a message indicating the session was cleared and reset (expiry, inactivity). This feature must abort and never resume if that occurs.
    this.ee.on(SESSION_EVENTS.RESET, () => {
      this.abort()
    })

    // The SessionEntity class can emit a message indicating the session was paused (visibility change). This feature must stop recording if that occurs.
    this.ee.on(SESSION_EVENTS.PAUSE, () => { this.stopRecording() })
    // The SessionEntity class can emit a message indicating the session was resumed (visibility change). This feature must start running again (if already running) if that occurs.
    this.ee.on(SESSION_EVENTS.RESUME, () => {
      if (!this.initialized || this.mode === MODE.OFF) return
      this.startRecording()
      this.takeFullSnapshot()
    })

    // Bespoke logic for new endpoint.  This will change as downstream dependencies become solidified.
    this.scheduler = new HarvestScheduler('blob', {
      onFinished: this.onHarvestFinished.bind(this),
      retryDelay: this.harvestTimeSeconds,
      getPayload: this.prepareHarvest.bind(this),
      raw: true
    }, this)

    // Wait for an error to be reported.  This currently is wrapped around the "Error" feature.  This is a feature-feature dependency.
    // This was to ensure that all errors, including those on the page before load and those handled with "noticeError" are accounted for. Needs evalulation
    registerHandler('errorAgg', (e) => {
      this.hasError = true
      // run once
      if (this.mode === MODE.ERROR) {
        this.mode = MODE.FULL
        // if the error was noticed AFTER the recorder was already imported....
        if (recorder && this.initialized) {
          this.stopRecording()
          this.startRecording()
          this.scheduler.startTimer(this.harvestTimeSeconds)

          const { session } = getRuntime(this.agentIdentifier)
          session.state.sessionReplay = this.mode
        }
      }
    }, this.featureName, this.ee)

    // new handler for waiting for multiple flags.  will be useful if/when backend designs multiple flags, or for evaluating multiple feature flags simultaneously (stn vs sr)
    this.waitForFlags(['sr']).then(([flagOn]) => this.initializeRecording(
      flagOn,
      Math.random() < getConfigurationValue(this.agentIdentifier, 'session_replay.errorSampleRate'),
      Math.random() < getConfigurationValue(this.agentIdentifier, 'session_replay.sampleRate')
    )).then(() => sharedChannel.onReplayReady(this.mode)) // notify watchers that replay started with the mode

    drain(this.agentIdentifier, this.featureName)
  }

  /**
   * Evaluate entitlements and sampling before starting feature mechanics, importing and configuring recording library, and setting storage state
   * @param {boolean} entitlements - the true/false state of the "sr" flag from RUM response
   * @param {boolean} errorSample - the true/false state of the error sampling decision
   * @param {boolean} fullSample - the true/false state of the full sampling decision
   * @returns {void}
   */
  async initializeRecording (entitlements, errorSample, fullSample) {
    this.initialized = true
    if (!entitlements) return

    const { session } = getRuntime(this.agentIdentifier)
    // if theres an existing session replay in progress, there's no need to sample, just check the entitlements response
    // if not, these sample flags need to be checked
    // if this isnt the FIRST load of a session AND
    // we are not actively recording SR... DO NOT import or run the recording library
    // session replay samples can only be decided on the first load of a session
    // session replays can continue if already in progress
    if (!session.isNew) { // inherit the mode of the existing session
      this.mode = session.state.sessionReplay
    } else {
      // The session is new... determine the mode the new session should start in
      if (fullSample) this.mode = MODE.FULL // full mode has precedence over error mode
      else if (errorSample) this.mode = MODE.ERROR
      // If neither are selected, then don't record (early return)
      else return
    }

    // FULL mode records AND reports from the beginning, while ERROR mode only records (but does not report).
    // ERROR mode will do this until an error is thrown, and then switch into FULL mode.
    // If an error happened in ERROR mode before we've gotten to this stage, it will have already set the mode to FULL
    if (this.mode === MODE.FULL) {
      // We only report (harvest) in FULL mode
      this.scheduler.startTimer(this.harvestTimeSeconds)
    }

    // If an error was noticed before the mode could be set (like in the early lifecycle of the page), immediately set to FULL mode
    if (this.mode === MODE.ERROR && this.errorNoticed) {
      this.mode = MODE.FULL
    }
    // We record in FULL or ERROR mode

    recorder = (await import(/* webpackChunkName: "recorder" */'rrweb')).record
    this.startRecording()
    const { gzipSync, strToU8 } = await import(/* webpackChunkName: "compressor" */'fflate')
    gzipper = gzipSync
    u8 = strToU8

    this.isFirstChunk = !!session.isNew

    session.state.sessionReplay = this.mode
  }

  prepareHarvest (options) {
    if (this.events.length === 0) return
    const payload = this.getHarvestContents()
    try {
      payload.body = gzipper(u8(stringify(payload.body)))
      this.scheduler.opts.gzip = true
    } catch (err) {
      // failed to gzip
      this.scheduler.opts.gzip = false
    }
    // TODO -- Gracefully handle the buffer for retries.
    this.clearBuffer()
    return [payload]
  }

  getHarvestContents () {
    const agentRuntime = getRuntime(this.agentIdentifier)
    const info = getInfo(this.agentIdentifier)
    return {
      qs: {
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: info.licenseKey
      },
      body: {
        type: 'SessionReplay',
        appId: Number(info.applicationID),
        timestamp: Date.now(),
        blob: JSON.stringify(this.events), // this needs to be a stringified JSON array of rrweb nodes
        attributes: {
          session: agentRuntime.session.state.value,
          hasSnapshot: this.hasSnapshot,
          hasError: this.hasError,
          agentVersion: agentRuntime.version,
          isFirstChunk: this.isFirstChunk,
          'nr.rrweb.version': RRWEB_VERSION
        }
      }
    }
  }

  onHarvestFinished (result) {
    // The mutual decision for now is to stop recording and clear buffers if ingest is experiencing 429 rate limiting
    if (result.status === 429) {
      this.abort()
    }

    if (this.blocked) this.scheduler.stopTimer(true)
  }

  /** Clears the buffer (this.events), and resets all payload metadata properties */
  clearBuffer () {
    this.events = []
    this.isFirstChunk = false
    this.hasSnapshot = false
    this.hasError = false
    this.payloadBytesEstimation = 0
  }

  /** Begin recording using configured recording lib */
  startRecording () {
    if (!recorder) {
      warn('Recording library was never imported')
      return this.abort()
    }
    const { blockClass, ignoreClass, maskTextClass, blockSelector, maskInputOptions, maskTextSelector, maskAllInputs } = getConfigurationValue(this.agentIdentifier, 'session_replay')
    this.hasSnapshot = true
    // set up rrweb configurations for maximum privacy --
    // https://newrelic.atlassian.net/wiki/spaces/O11Y/pages/2792293280/2023+02+28+Browser+-+Session+Replay#Configuration-options
    this.stopRecording = recorder({
      emit: this.store.bind(this),
      blockClass,
      ignoreClass,
      maskTextClass,
      blockSelector,
      maskInputOptions,
      maskTextSelector,
      maskAllInputs,
      ...(this.mode === MODE.ERROR && { checkoutEveryNms: CHECKOUT_MS })
    })
  }

  /** Store a payload in the buffer (this.events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    if (this.blocked) return
    const eventBytes = stringify(event).length
    /** The estimated size of the payload after compression */
    const payloadSize = this.getPayloadSize(eventBytes)
    // Vortex will block payloads at a certain size, we might as well not send.
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return this.abort()
    }
    // Checkout events are flags by the recording lib that indicate a fullsnapshot was taken every n ms. These are important
    // to help reconstruct the replay later and must be included.  While waiting and buffering for errors to come through,
    // each time we see a new checkout, we can drop the old data.
    if (this.mode === MODE.ERROR && isCheckout) {
      // we are still waiting for an error to throw, so keep wiping the buffer over time
      this.clearBuffer()
    }

    this.events.push(event)
    this.payloadBytesEstimation += eventBytes

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (payloadSize > IDEAL_PAYLOAD_SIZE) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      this.scheduler.runHarvest()
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    if (!recorder) return
    recorder.takeFullSnapshot()
    this.hasSnapshot = true
  }

  /** Estimate the payload size */
  getPayloadSize (newBytes = 0) {
    // the 1KB gives us some padding for the other metadata
    return this.estimateCompression(this.payloadBytesEstimation + newBytes) + 1000
  }

  /** Abort the feature, once aborted it will not resume */
  abort () {
    this.blocked = true
    this.stopRecording()
    const { session } = getRuntime(this.agentIdentifier)
    session.state.sessionReplay = this.mode
  }

  /** Extensive research has yielded about an 88% compression factor on these payloads.
   * This is an estimation using that factor as to not cause performance issues while evaluating
   * https://staging.onenr.io/037jbJWxbjy
   * */
  estimateCompression (data) {
    return data * 0.12
  }
}
