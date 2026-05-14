/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { getRegisteredTargetsFromId } from './utils'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 */

// MFE FCP Tracker (compact version for minimal bundle impact)
const mfeFCP = new Map()
const mfeSubs = new Map()
let mfeObs = null
let mfeAgent = null

/**
 * Subscribes a timings object to receive FCP updates for a specific MFE ID
 * @param {string} id - The MFE ID to track
 * @param {RegisterAPITimings} timings - The timings object to update when FCP is detected
 * @param {Object} agent - The agent reference
 */
export function subscribeMFEFCP (id, timings, agent) {
  if (!id || !agent) return
  if (!mfeObs) {
    mfeAgent = agent
    if (globalScope.MutationObserver && globalScope.document) {
      mfeObs = new MutationObserver(ms => {
        if (!mfeSubs.size) return
        ms.forEach(m => m.addedNodes.forEach(n => {
          const t = n.textContent?.trim()
          const tag = n.nodeName?.toLowerCase()
          if (!t && tag !== 'img' && tag !== 'video' && tag !== 'canvas' && tag !== 'svg') return
          try {
            let e = n.nodeType === 1 ? n : n.parentElement
            while (e?.tagName) {
              const mid = e.dataset?.nrMfeId
              if (mid) {
                getRegisteredTargetsFromId(mid, mfeAgent).forEach(tgt => {
                  if (tgt?.id && !mfeFCP.has(tgt.id)) {
                    const fcp = now()
                    mfeFCP.set(tgt.id, fcp)
                    mfeSubs.get(tgt.id)?.forEach(ti => { ti.fcp = fcp })
                    mfeSubs.delete(tgt.id)
                  }
                })
              }
              e = e.parentNode
            }
          } catch (e) {}
        }))
      })
      mfeObs.observe(globalScope.document, { childList: true, subtree: true })
    }
  }
  const sid = String(id)
  if (mfeFCP.has(sid)) timings.fcp = mfeFCP.get(sid)
  else {
    if (!mfeSubs.has(sid)) mfeSubs.set(sid, new Set())
    mfeSubs.get(sid).add(timings)
  }
}
