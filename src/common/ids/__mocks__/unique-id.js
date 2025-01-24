/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { faker } from '@faker-js/faker'

export function generateUuid () {
  return faker.string.uuid()
}

export function generateRandomHexString (length) {
  return faker.string.hexadecimal({ length, prefix: '' })
}

export function generateSpanId () {
  return generateRandomHexString(16)
}

export function generateTraceId () {
  return generateRandomHexString(32)
}
