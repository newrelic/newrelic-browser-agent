/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

class Test {
  constructor (name, spec, fn) {
    this.name = name
    this.spec = spec
    this.fn = fn
    const fullPath = ((new Error().stack).split("at ")[3]).trim()
    const testPath = "./tests" + fullPath.split('/tests')[fullPath.split('/tests').length -1]
    this.fileName = testPath.split(":")[0]
  }
}

module.exports = Test
