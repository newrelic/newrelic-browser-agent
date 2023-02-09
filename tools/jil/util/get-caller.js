/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function getCaller () {
  // 0 is getStack
  // 1 is getCaller
  // 2 is callSite of getCaller
  // 3 is the thing that called the thing that called thiss
  return getStack()[3].getFileName()
}

function getStack () {
  let original = Error.prepareStackTrace
  Error.prepareStackTrace = (raw, stack) => stack
  let stack = new Error().stack
  Error.prepareStackTrace = original
  return stack
}

module.exports = getCaller
