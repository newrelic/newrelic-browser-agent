/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const BaseFormatter = require('./base-formatter');

let startTimestamp = Date.now();

class MergedTapFormatter extends BaseFormatter {
  constructor(config) {
    super();
    this.assertions = 0;
    this.passed = 0;
    this.failed = 0;
    this.includeTimestamps = config.timestamps;
  }

  start() {
    this.log('TAP version 13\n');
  }

  addOutputParser(parser) {
    parser.on('assert', (d, indent, parents) => {
      this.countAssertion(d);
      this.log(this.formatAssertion(parser, parents, d));
      if (d.formattedDiag) this.log(this.formatDiag(d));
    });

    parser.on('comment', (d) => {
      this.log(this.formatComment(parser, d));
    });
    parser.on('extra', (d) => this.log(`# ${d}`));
  }

  countAssertion(assertion) {
    this.assertions += 1;
    if (assertion.ok) this.passed += 1;
    else this.failed += 1;
  }

  getLabel(parser) {
    let label;
    if (this.includeTimestamps) {
      let delta = Date.now() - startTimestamp;
      label = `${parser.name} at ${delta} ms`;
    } else {
      label = parser.name;
    }
    return label;
  }

  formatComment(parser, data) {
    return `# ${this.getLabel(parser)} -> ${data}`;
  }

  formatAssertion(parser, parents, assertion) {
    let testName = [this.getLabel(parser), ...parents, assertion.name].join(' -> ');
    return `${assertion.ok ? 'ok' : 'not ok'} ${testName}`;
  }

  formatDiag(assertion) {
    return this.fixYaml(assertion.formattedDiag);
  }

  fixYaml(yaml) {
    return yaml
      .split('\n')
      .map((line) => {
        // allow opening, closing, and line with keys on them
        if (line.match(/^\s{2,4}(?:\w+:|```|---).*/)) return line;
        return line.replace(/\[|\||-|\?|:/g, '?');
      })
      .join('\n');
  }

  finish(ok) {
    if (!ok && this.passed === this.assertions && !this.failed) {
      this.log('# finished called with not ok although everything passed (likely due to missing plan)');
    }

    var noFailures = this.passed === this.assertions && !this.failed && this.ok;
    if (!noFailures) {
      if (!this.ok) this.log('# received data on std error of a child process');

      if (this.passed !== this.assertions || this.failed) this.log('# not all assertions passed');

      // mk: not sure why number of assertions and failed is increased here, it always
      // results in one additional count, not matching number of assertions
      this.assertions++;
      this.failed++;
    }

    this.log(`1..${this.assertions}`);
    this.log(`# tests ${this.assertions}`);
    this.log(`# pass ${this.passed}`);
    if (this.failed) {
      this.log(`# fail ${this.failed}`);
      this.log('# not ok');
    } else {
      this.log('# ok');
    }

    super.finish(noFailures);
  }
}

module.exports = MergedTapFormatter;
