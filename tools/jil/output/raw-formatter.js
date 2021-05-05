/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const BaseFormatter = require('./base-formatter')

class RawFormatter extends BaseFormatter {
  addOutputParser (parser) {
    parser.on('out', (out) => this.log(out))
  }
}

module.exports = RawFormatter
