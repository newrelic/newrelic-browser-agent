import { record as recorder } from 'rrweb'
import { MODE } from '../../common/session/session-entity'
import { stringify } from '../../common/util/stringify'
import { ABORT_REASONS, AVG_COMPRESSION, CHECKOUT_MS, IDEAL_PAYLOAD_SIZE, MAX_PAYLOAD_SIZE, QUERY_PARAM_PADDING, RRWEB_EVENT_TYPES } from './constants'
import { now } from '../../common/timing/now'
import { getConfigurationValue, getRuntime } from '../../common/config/config'

export class Recorder {
  /** Each page mutation or event will be stored (raw) in this array. This array will be cleared on each harvest */
  #events = []
  /** Backlog used for a 2-part sliding window to guarantee a 15-30s buffer window */
  #backloggedEvents = []
  /** 2D array -- Will be filled only if forced harvest was triggered and harvester does not exist */
  #forced = []

  constructor (parent) {
    /** Payload metadata -- Should indicate when a replay blob started recording.  Resets each time a harvest occurs.
     * cycle timestamps are used as fallbacks if event timestamps cannot be used
     */
    this.cycleTimestamp = undefined

    /** A value which increments with every new mutation node reported. Resets after a harvest is sent */
    this.payloadBytesEstimation = 0
    /** Payload metadata -- Should indicate that the payload being sent has a full DOM snapshot. This can happen
     * -- When the recording library begins recording, it starts by taking a DOM snapshot
     * -- When visibility changes from "hidden" -> "visible", it must capture a full snapshot for the replay to work correctly across tabs
    */
    this.hasSnapshot = false
    /** Payload metadata -- Should indicate that the payload being sent has a meta node. The meta node should always precede a snapshot node. */
    this.hasMeta = false
    /** Payload metadata -- Should indicate that the payload being sent contains an error.  Used for query/filter purposes in UI */
    this.hasError = false
    /** Hold on to the last meta node, so that it can be re-inserted if the meta and snapshot nodes are broken up due to harvesting */
    this.lastMeta = undefined
    /** True when actively recording, false when paused or stopped */
    this.recording = false

    this.parent = parent

    /** The method to stop recording. This defaults to a noop, but is overwritten once the recording library is imported and initialized */
    this.stopRecording = () => { /* no-op until set by rrweb initializer */ }
  }

  getEvents () {
    if (this.#forced.length) return { events: this.#forced[0], type: 'forced' }
    return { events: [...this.#backloggedEvents, ...this.#events], type: 'standard' }
  }

  /** Clears the buffer (this.#events), and resets all payload metadata properties */
  clearBuffer () {
    if (this.#forced.length) this.#forced.shift()
    else if (this.parent.mode === MODE.ERROR) {
      this.#backloggedEvents = this.#events
      this.#events = []
    } else this.#backloggedEvents = this.#events = []
    this.hasSnapshot = false
    this.hasMeta = false
    this.hasError = false
    this.payloadBytesEstimation = 0
    this.clearTimestamps()
  }

  /** Begin recording using configured recording lib */
  startRecording () {
    this.recording = true
    const { block_class, ignore_class, mask_text_class, block_selector, mask_input_options, mask_text_selector, mask_all_inputs, inline_images, inline_stylesheet, collect_fonts } = getConfigurationValue(this.parent.agentIdentifier, 'session_replay')
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
      checkoutEveryNms: CHECKOUT_MS[this.parent.mode]
    })

    this.stopRecording = () => {
      this.recording = false
      stop()
    }
  }

  /** Store a payload in the buffer (this.#events).  This should be the callback to the recording lib noticing a mutation */
  store (event, isCheckout) {
    this.setTimestamps()
    if (this.parent.blocked) return
    const eventBytes = stringify(event).length
    /** The estimated size of the payload after compression */
    const payloadSize = this.getPayloadSize(eventBytes)
    // Vortex will block payloads at a certain size, we might as well not send.
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      this.clearBuffer()
      return this.parent?.abort?.(ABORT_REASONS.TOO_BIG)
    }
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
      this.hasMeta = true
    }
    // snapshot event
    if (event.type === RRWEB_EVENT_TYPES.FullSnapshot) {
      this.hasSnapshot = true
    }

    this.#events.push(event)
    this.payloadBytesEstimation += eventBytes

    // We are making an effort to try to keep payloads manageable for unloading.  If they reach the unload limit before their interval,
    // it will send immediately.  This often happens on the first snapshot, which can be significantly larger than the other payloads.
    if (payloadSize > IDEAL_PAYLOAD_SIZE && this.parent.mode !== MODE.ERROR) {
      // if we've made it to the ideal size of ~64kb before the interval timer, we should send early.
      if (this.parent.scheduler) this.parent.scheduler.runHarvest()
      else this.#forced = this.#events.splice(0)
    }
  }

  /** force the recording lib to take a full DOM snapshot.  This needs to occur in certain cases, like visibility changes */
  takeFullSnapshot () {
    recorder.takeFullSnapshot()
  }

  setTimestamps () {
    // fallbacks if timestamps cannot be derived from rrweb events
    if (!this.cycleTimestamp) this.cycleTimestamp = getRuntime(this.parent.agentIdentifier).offset + now()
  }

  clearTimestamps () {
    this.cycleTimestamp = undefined
  }

  /** Estimate the payload size */
  getPayloadSize (newBytes = 0) {
    // the query param padding constant gives us some padding for the other metadata to be safely injected
    return this.estimateCompression(this.payloadBytesEstimation + newBytes) + QUERY_PARAM_PADDING
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
