/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
let nodesSeen = 0

export class BelNode {
  belType
  /** List of other BelNode derivatives. Each children should be of a subclass that implements its own 'serialize' function. */
  children = []
  start
  end
  callbackEnd = 0
  callbackDuration = 0
  nodeId = ++nodesSeen

  constructor (agentRef) {
    this.obfuscator = agentRef.runtime.obfuscator
    this.info = agentRef.info
  }

  addChild (child) {
    this.children.push(child)
  }

  /** Virtual fn for stringifying an instance. */
  serialize () {}
}
