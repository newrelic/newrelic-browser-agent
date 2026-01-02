/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** All nodes reported to the consumer must take this shape */
export class TraceNode {
  constructor (name, start, end, origin, type) {
    this.n = name
    this.s = start
    this.e = end
    this.o = origin
    this.t = type
  }
}
