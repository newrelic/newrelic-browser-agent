/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const Obfuscator = jest.fn(function () {
  this.ruleValidationCache = []
  this.obfuscateString = jest.fn(input => input)
})

Obfuscator.prototype.validateObfuscationRule = jest.fn(rule => true)
Obfuscator.prototype.getRuleValidationCache = jest.fn(agentIdentifier => [])
