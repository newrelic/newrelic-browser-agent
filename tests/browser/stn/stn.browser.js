/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test.js');
const { setup } = require('../utils/setup');

const { Instrument: StnInstrument } = require('../../../src/features/session_trace/instrument/index');
const { Instrument: AjaxInstrument } = require('../../../src/features/ajax/instrument/index');
const { Aggregate: AjaxAggregate } = require('../../../src/features/ajax/aggregate/index');
const { Instrument: JsErrorsInstrument } = require('../../../src/features/jserrors/instrument/index');
const { Aggregate: JsErrorsAggregate } = require('../../../src/features/jserrors/aggregate/index');

const { drain } = require('../../../src/common/drain/drain');

const { agentIdentifier, baseEE, aggregator } = setup();

new StnInstrument(agentIdentifier, aggregator, false);
new AjaxInstrument(agentIdentifier, aggregator, false);
new AjaxAggregate(agentIdentifier, aggregator);
new JsErrorsInstrument(agentIdentifier, aggregator, false);
new JsErrorsAggregate(agentIdentifier, aggregator);

drain(agentIdentifier, 'api');

let originalPath = window.location.pathname;

if (window.performance && window.performance.timing && window.performance.getEntriesByType) {
  runTests();
} else {
  test('unsupported browser', function (t) {
    t.skip('skipping tests because browser does not have perf timing api');
    t.end();
  });
}

// create session trace nodes for load events
document.addEventListener('DOMContentLoaded', () => null);
window.addEventListener('load', () => null);

function runTests() {
  const ee = baseEE;

  test('wait for trace node generation', function (t) {
    ee.emit('feat-err', []);
    t.plan(4);
    window.history.pushState(null, '', '#foo');
    window.history.pushState(null, '', '#bar');
    setTimeout(() => t.ok(true), 0);
    let interval = setInterval(() => {
      clearInterval(interval);
      t.ok(true);
    }, 0);
    window.requestAnimationFrame(() => {
      t.ok(true);
      throw new Error('raf error');
    });
    let xhr = new XMLHttpRequest();
    xhr.open('GET', window.location);
    xhr.send();
    xhr.addEventListener('load', () => t.ok(true));
  });

  test('session trace nodes', function (t) {
    const { Aggregate: StnAggregate } = require('../../../src/features/session_trace/aggregate/index');
    const stnAgg = new StnAggregate(agentIdentifier, aggregator);
    const { Aggregate: PvtAggregate } = require('../../../src/features/page_view_timing/aggregate/index');
    const pvtAgg = new PvtAggregate(agentIdentifier, aggregator);

    let fiVal = 30;
    let fidVal = 8;

    pvtAgg.addTiming('load', 20);
    pvtAgg.addTiming('fi', fiVal, { fid: fidVal });

    ee.emit('feat-stn', []);

    const payload = stnAgg.takeSTNs();

    let res = payload.body.res;
    let qs = payload.qs;

    t.ok(+qs.st > 1404952055986 && Date.now() > +qs.st, 'Start time is between recent time and now ' + qs.st);

    t.test('stn DOMContentLoaded', function (t) {
      let node = res.filter(function (node) {
        return node.n === 'DOMContentLoaded';
      })[0];
      t.ok(node, 'DOMContentLoaded node created');
      t.ok(node.s > 10, 'DOMContentLoaded node has start time ' + node.s);
      t.equal(node.o, 'document', 'DOMContentLoaded node origin ' + node.o);
      t.end();
    });
    t.test('stn document load', function (t) {
      let node = res.filter(function (node) {
        return node.n === 'load' && node.o === 'document';
      })[0];
      t.ok(node, 'load node created');
      t.ok(node.s > 10, 'load node has start time ' + node.s);
      t.equal(node.o, 'document', 'load node origin ' + node.o);
      t.end();
    });
    t.test('stn timer', function (t) {
      let node = res.filter(function (node) {
        return node.n === 'setInterval';
      })[0];
      t.ok(node, 'timer node created');
      t.ok(node.s > 10, 'timer node has start time ' + node.s);
      t.equal(node.o, 'window', 'setInterval origin ' + node.o);
      t.end();
    });
    t.test('stn-raf', function (t) {
      let node = res.filter(function (node) {
        return node.n === 'requestAnimationFrame';
      })[0];
      t.ok(node, 'raf node created');
      t.ok(node.s > 10, 'raf node has start time ' + node.s);
      t.equal(node.o, 'window', 'requestAnimationFrame origin ' + node.o);
      t.end();
    });
    t.test('stn error', function (t) {
      let errorNode = res.filter(function (node) {
        return node.o === 'raf error';
      })[0];
      t.ok(errorNode, 'error node created');
      t.ok(errorNode.s > 10, 'error node has start time ' + errorNode.s);
      t.equal(errorNode.s, errorNode.e, 'error node has no duration');
      t.end();
    });
    t.test('stn ajax', function (t) {
      let ajax = res.filter(function (node) {
        return node.t === 'ajax';
      })[0];
      t.ok(ajax, 'ajax node created');
      t.ok(ajax.e - ajax.s > 1, 'Ajax has some duration');
      t.equal(ajax.n, 'Ajax', 'Ajax name');
      t.equal(ajax.t, 'ajax', 'Ajax type');
      t.end();
    });
    t.test('stn history', function (t) {
      let hist = res.filter(function (node) {
        return node.n === 'history.pushState';
      })[1];
      t.ok(hist, 'hist node created');
      t.equal(hist.s, hist.e, 'hist node has no duration');
      t.equal(hist.n, 'history.pushState', 'hist name');
      t.equal(hist.o, `${originalPath}#bar`, 'new path');
      t.equal(hist.t, `${originalPath}#foo`, 'old path');
      t.end();
    });
    t.test('stn pvt items', function (t) {
      let pvtItems = res.filter(function (node) {
        return node.n === 'fi' || node.n === 'fid';
      });
      t.ok(pvtItems.length === 2, 'all pvt items exist');

      for (let i = 0; i < pvtItems.length; i++) {
        let x = pvtItems[i];
        if (x.n === 'fi') {
          t.ok(x.o === 'document', 'FI owner is document');
          t.ok(x.s === x.e, 'FI has no duration');
          t.ok(x.t === 'timing', 'FI is a timing node');
        }
        if (x.n === 'fid') {
          t.ok(x.o === 'document', 'FID owner is document');
          t.ok(x.s === fiVal && x.e === fiVal + fidVal, 'FID has a duration relative to FI');
          t.ok(x.t === 'event', 'FID is an event node');
        }
      }
      t.end();
    });
    let unknown = res.filter(function (n) {
      return n.o === 'unknown';
    });
    t.equal(unknown.length, 0, 'No events with unknown origin');

    t.end();
  });
}
