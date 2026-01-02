/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function toTitleCase (str, regex = /\w*/g) {
  return str.replace(
    regex,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  )
}
