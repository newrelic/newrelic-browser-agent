/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const exists = typeof (window.performance) !== 'undefined' && window.performance.timing &&
    typeof (window.performance.timing.navigationStart) !== 'undefined';