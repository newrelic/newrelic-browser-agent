/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * @fileoverview; Extracts the cause string from an error object.
 */

import { stringify } from '../../../common/util/stringify'
import { computeStackTrace } from './compute-stack-trace'

/**
 * Extracts and normalizes a string from an error instance with a cause attribute.
 * @param {Error} err - The error object to extract the cause from.
 * @returns {string} The cause string extracted from the error object. Will be an empty string if no cause is present.
 */
export function buildCauseString (err) {
  let causeStackString = ''
  if (!err?.cause) return causeStackString
  if (err.cause instanceof Error) causeStackString = computeStackTrace(err.cause).stackString || err.cause.stack
  else causeStackString = typeof err.cause === 'string' ? err.cause : stringify(err.cause)
  causeStackString ||= err.cause.toString() // fallback to try the string representation if all else fails
  return causeStackString
}
