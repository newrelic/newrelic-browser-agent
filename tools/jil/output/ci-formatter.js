/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const MergedTap = require('./merged-tap-formatter');

class CIFormatter extends MergedTap {
  addOutputParser(parser) {
    let lines = [];
    let parserStart = Date.now();

    parser.on('assert', (d, indent, parents) => {
      this.countAssertion(d);
      lines.push(this.formatAssertion(parser, parents, d));
      if (d.formattedDiag) lines.push(this.formatDiag(d));
    });

    parser.on('comment', (d) => lines.push(`# ${d}`));
    parser.on('extra', (d) => lines.push(`# ${d}`));

    parser.on('complete', () => {
      let delta = Date.now() - parserStart;
      lines.push(`# ${parser.name} finished in ${delta} ms`);
      lines.forEach((line) => this.log(line));
    });
  }
}

module.exports = CIFormatter;
