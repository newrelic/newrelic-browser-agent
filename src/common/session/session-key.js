/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// Deterministic 32-bit FNV-1a hash, rendered as a fixed 8-char hex string.
function hashTo8Hex (value) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function getAppSessionHash (licenseKey, applicationID) {
  return hashTo8Hex(`${String(licenseKey)}:${String(applicationID)}`)
}
