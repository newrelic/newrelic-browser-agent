/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Test one:
//   Throws an uncaught error.
//   Triggers js agent window.onerror handler.
//     Stores the uncaught error.
//     Calls the original window.onerror handler.
//       Throws the error that reports back that it was called.
;(function uncaughtError () { throw new Error('uncaught error') })()
