/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBrowserScope } from '../constants/runtime'
import { send } from './send'
import { TimeKeeper } from '../timing/time-keeper'
import { activateFeatures } from '../util/feature-flags'
import { now } from '../timing/now'
import { warn } from '../util/console'
import { VERSION } from '../constants/env'
import { FEATURE_NAMES, FEATURE_TO_ENDPOINT } from '../../loaders/features/features'
import { handle } from '../event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'

const MAX_CONNECT_ATTEMPTS = 3
const CONNECT_RETRY_BASE_MS = 3000 // affects each retry window proportionally (attempt 2: 0-3s, 3: 0-6s, 4: 0-12s, etc)

export class Connector {
  #agentRef
  #connectStartTime
  #numOfAttempts = 0

  constructor (agentRef) {
    if (!agentRef.init.feature_flags.includes('rum_v2')) return // the Connector does not run in v1; legacy PVE has its own BCS handling
    this.#agentRef = agentRef
    agentRef.runtime.timeKeeper = new TimeKeeper(agentRef.runtime.session)

    if (isBrowserScope) {
      const cached = agentRef.runtime.session && agentRef.runtime.session.state.cachedRumResponse
      if (cached) {
        if (cached.config) { // the old v1 RUM response does not have a config field, so this guards against breaking change on existing sessions at release time
          this.#applyConnectResponse(cached)
          return
        } else this.#agentRef.runtime.session.reset() // this can be removed on the next version after rls, once the old format and sessions have expired or reset
      }
    }
    this.makeConnectRequest()
  }

  makeConnectRequest () {
    this.#connectStartTime = now()
    return send(this.#agentRef, {
      endpoint: `connect/2/${this.#agentRef.info.licenseKey}`,
      payload: {
        body: {},
        qs: {
          a: this.#agentRef.info.applicationID,
          v: VERSION
        }
      },
      localOpts: { sendEmptyBody: true },
      raw: true,
      featureName: 'connect',
      cbFinished: this.#processConnectResponse.bind(this)
    })
  }

  #applyConnectResponse (response) {
    if (!Object.keys(this.#agentRef.runtime.appMetadata).length) this.#agentRef.runtime.appMetadata = response.app
    activateFeatures(response.config, this.#agentRef)
  }

  #processConnectResponse ({ sent, status, retry, xhr, responseText }) {
    const connectEndTime = now()
    const session = this.#agentRef.runtime.session

    if (session) {
      // Double check that there isn't a response saved (e.g. from another agent/browser tab) btwn the async time of the request and now in a race-condition.
      const cachedResp = session.state.cachedRumResponse
      if (cachedResp) {
        this.#applyConnectResponse(cachedResp)
      }
    }

    const shouldRetry = sent && retry // important to note: no retry if HTTP status is 0
    if (shouldRetry && ++this.#numOfAttempts < MAX_CONNECT_ATTEMPTS) {
      // We use an exponential backoff calculation for the retry to avoid thundering herd, skipping any further processing.
      const delay = Math.floor(Math.random() * CONNECT_RETRY_BASE_MS * (2 ** (this.#numOfAttempts - 1)))
      setTimeout(this.makeConnectRequest.bind(this), delay)
      return
    }

    if (status >= 400 || status === 0) {
      warn(18, status)

      // Get estimated payload size of our backlog.
      const textEncoder = new TextEncoder()
      const payloadSize = Object.values(newrelic.ee.backlog).reduce((acc, value) => {
        if (!value) return acc
        const encoded = textEncoder.encode(value)
        return acc + encoded.byteLength
      }, 0)

      // Send SMs about the (last) failed connect request, then abort agent.
      const BCSError = 'BCS/Error/'
      const sm = [{
        params: {
          name: BCSError + status
        },
        stats: {
          c: 1
        }
      }, {
        params: {
          name: BCSError + 'Duration/Ms'
        },
        stats: {
          c: 1,
          t: connectEndTime - this.#connectStartTime
        }
      }, {
        params: {
          name: BCSError + 'Dropped/Bytes'
        },
        stats: {
          c: 1,
          t: payloadSize
        }
      }]
      send(this.#agentRef, { // note we have to send it this way because the Metrics feature will never be harvested under this branch of code (BCS failure)
        endpoint: FEATURE_TO_ENDPOINT[FEATURE_NAMES.metrics],
        payload: { body: { sm } },
        featureName: FEATURE_NAMES.metrics
      })

      this.#agentRef.ee.abort()
      return
    }

    let resp
    try {
      resp = JSON.parse(responseText)
    } catch (error) {
      warn(53, error)
      this.#agentRef.ee.abort()
      return
    }
    if (session) session.write({ cachedRumResponse: resp }) // store the response for other pages later in same session or in parallel tabs
    try {
      const wasReady = this.#agentRef.runtime.timeKeeper.ready
      this.#agentRef.runtime.timeKeeper.processRumRequest(xhr, this.#connectStartTime, connectEndTime, resp.app.nrServerTime)
      if (!this.#agentRef.runtime.timeKeeper.ready) throw new Error('TimeKeeper not ready')

      // If timeKeeper's origin time is ahead of nrServerTime, then the timestamp is invalid. Report a supportability metric.
      const timeDiff = this.#agentRef.runtime.timeKeeper.correctedOriginTime - resp.app.nrServerTime
      if (wasReady && timeDiff > 0) {
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Generic/TimeKeeper/InvalidTimestamp/Seen', timeDiff], undefined, FEATURE_NAMES.metrics, this.#agentRef.ee)
      }
    } catch (error) {
      warn(17, error)
      this.#agentRef.ee.abort()
      return
    }

    this.#applyConnectResponse(resp)
  }
}
