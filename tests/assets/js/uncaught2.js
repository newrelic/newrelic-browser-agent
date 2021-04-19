/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Test Two:
//   Calls js agent window.onerror handler manually with a fake error.
//     stores the fake error.
//     Calls original window.onerror.
//       returns 'abc'
//   Throws an error with the above information to report back.
//   Triggers js agent window.onerror handler
//     Stores 'original return abc' error

// Thrown error used as a convoluted way to
// report to the fake beacon what window.onerror returns.
;(function onerrorReturn () { throw new Error('original return ' + window.onerror.call(this, 'fake')) })()
