/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseFormatter from './base-formatter'

export default class RawFormatter extends BaseFormatter {
  addOutputParser (parser) {
    parser.on('out', (out) => this.log(out))
  }
}
