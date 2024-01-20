import { record as recorder } from 'rrweb'
import { stringify } from '../../../common/util/stringify'
import { AVG_COMPRESSION, CHECKOUT_MS, IDEAL_PAYLOAD_SIZE, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES } from '../constants'
import { getConfigurationValue } from '../../../common/config/config'
import { RecorderEvents } from './recorder-events'
import { MODE } from '../../../common/session/constants'
import { stylesheetEvaluator } from './stylesheet-evaluator'
import { handle } from '../../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'

export class Recorder {
  /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
  #events = new RecorderEvents()
  /** Backlog used for a 2-part sliding window to guarantee a 15-30s buffer window */
  #backloggedEvents = new RecorderEvents()
  /** array of recorder events -- Will be filled only if forced harvest was triggered and harvester does not exist */
  #preloaded = [new RecorderEvents()]
  /** flag that if true, blocks events from being "stored".  Only set to true when a full snapshot has incomplete nodes (only stylesheets ATM) */
  #fixing = false

  constructor (parent) {
    /** True when actively recording, false when paused or stopped */
    this.recording = false
    this.currentBufferTarget = this.#events
    /** Hold on to the last meta node, so that it can be re-inserted if the meta and snapshot nodes are broken up due to harvesting */
    this.lastMeta = false

    this.parent = parent

    this.shouldAudit = getConfigurationValue(parent.agentIdentifier, 'session_replay.fetch_incomplete_assets')

    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }
  }

  getEvents () {
    if (this.#preloaded[0]?.events.length) return { ...this.#preloaded[0], type: 'preloaded' }
    return {
      events: [...this.#backloggedEvents.events, ...this.#events.events].filter(x => x),
      type: 'standard',
      cycleTimestamp: Math.min(this.#backloggedEvents.cycleTimestamp, this.#events.cycleTimestamp),
      payloadBytesEstimation: this.#backloggedEvents.payloadBytesEstimation + this.#events.payloadBytesEstimation,
      hasError: this.#backloggedEvents.hasError || this.#events.hasError,
      hasMeta: this.#backloggedEvents.hasMeta || this.#events.hasMeta,
      hasSnapshot: this.#backloggedEvents.hasSnapshot || this.#events.hasSnapshot
    }
  }

  /** Clears the buffer (this.#events), and resets all payload metadata properties */
  clearBuffer () {
    if (this.#preloaded[0]?.events.length) this.#preloaded.shift()
    else if (this.parent.mode === MODE.ERROR) this.#backloggedEvents = this.#events
    else this.#backloggedEvents = new RecorderEvents()
    this.#events = new RecorderEvents()
  }

  /** Begin recording using configured recording lib */
  startRecording () {
    this.recording = true
    const { block_class, ignore_class, mask_text_class, block_selector, mask_input_options, mask_text_selector, mask_all_inputs, inline_stylesheet, inline_images, collect_fonts } = getConfigurationValue(this.parent.agentIdentifier, 'session_replay')
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
      maskAllInputs: mask_all_inputs,
      inlineStylesheet: inline_stylesheet,
      inlineImages: inline_images,
      collectFonts: collect_fonts,
      checkoutEveryNms: CHECKOUT_MS[this.parent.mode]
    })

    this.stopRecording = () => {
      this.recording = false
      stop()
    }
  }

  /**
   * audit - Checks if the event node payload is missing certain attributes
   * will forward on to the "store" method if nothing needs async fixing
   * @param {*} event - An RRWEB event node
   * @param {*} isCheckout - Flag indicating if the payload was triggered as a checkout
   */
  audit (event, isCheckout) {
    if (!this.shouldAudit) return this.store(event, isCheckout)
    const incompletes = stylesheetEvaluator.evaluate()
    /** Only stop ignoring data if already ignoring and a new valid snapshap is taking place (0 incompletes and we get a meta node for the snap) */
    if (!incompletes.length && this.#fixing && event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = false
    if (incompletes.length) {
      incompletes.forEach(() => { handle(SUPPORTABILITY_METRIC_CHANNEL, ['SessionReplay/Payload/Missing-Inline-Css'], undefined, FEATURE_NAMES.metrics, this.parent.ee) })
      /** download the incompletes' src code and then take a new snap */
      stylesheetEvaluator.fix(incompletes).then(() => { this.takeFullSnapshot() })
      /** Only start ignoring data if got a faulty snapshot */
      if (event.type === RRWEB_EVENT_TYPES.FullSnapshot || event.type === RRWEB_EVENT_TYPES.Meta) this.#fixing = true
    }
    /** Only store the data if not being "fixed" (full snapshots that have broken css) */
    if (!this.#fixing) this.store(event, isCheckout)
  }

  /** Store a payload in the buffer (this.#events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    if (!event) return
    event.__serialized = stringify(event)

    if (!this.parent.scheduler && this.#preloaded.length) this.currentBufferTarget = this.#preloaded[this.#preloaded.length - 1]
    else this.currentBufferTarget = this.#events

    if (this.parent.blocked) return
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
    }

    this.currentBufferTarget.add(event)
    this.currentBufferTarget.payloadBytesEstimation += eventBytes

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (payloadSize > IDEAL_PAYLOAD_SIZE && this.parent.mode !== MODE.ERROR) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      if (this.parent.scheduler) {
        this.parent.scheduler.runHarvest()
      } else {
        // we are still in "preload" and it triggered a "stop point".  Make a new set, which will get pointed at on next cycle
        this.#preloaded.push(new RecorderEvents())
      }
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    recorder.takeFullSnapshot()
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
    if (this.shouldCompress) return data * AVG_COMPRESSION
    return data
  }
}
