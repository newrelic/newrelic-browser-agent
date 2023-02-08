/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test';
import { setup } from './utils/setup';
import { setRuntime, setInfo } from '../../src/common/config/config';
import * as sinon from 'sinon';
import * as harv from '../../src/common/harvest/harvest';
import { submitData } from '../../src/common/util/submit-data';
import { HarvestScheduler } from '../../src/common/harvest/harvest-scheduler';

const { agentIdentifier, aggregator } = setup();
const nrInfo = { errorBeacon: 'foo', licenseKey: 'bar' };
const nrOrigin = 'http://foo.com?bar=crunchy#bacon';
(() => {
  setInfo(agentIdentifier, nrInfo);
  setRuntime(agentIdentifier, { origin: nrOrigin });
})();

function resetSpies(options) {
  options = options || {};

  if (harv.Harvest.prototype.send.isSinonProxy) {
    harv.Harvest.prototype.send.restore();
  }
  if (harv.Harvest.prototype.sendX.isSinonProxy) {
    harv.Harvest.prototype.sendX.restore();
  }
  if (harv.getSubmitMethod.isSinonProxy) {
    harv.getSubmitMethod.restore();
  }
  if (HarvestScheduler.prototype.scheduleHarvest.isSinonProxy) {
    HarvestScheduler.prototype.scheduleHarvest.restore();
  }

  sinon.stub(harv.Harvest.prototype, 'send', fakeSend);
  sinon.stub(harv.Harvest.prototype, 'sendX', fakeSendX);
  sinon.stub(harv, 'getSubmitMethod', fakeGetSubmitMethod);

  function fakeSend(endpoint, payload, opts, submitMethod, cbFinished) {
    setTimeout(function () {
      var response = options.response || { sent: true };
      cbFinished(response);
    }, 0);
  }

  function fakeSendX(endpoint, opts, cbFinished) {
    setTimeout(function () {
      var response = options.response || { sent: true };
      cbFinished(response);
    }, 0);
  }

  function fakeGetSubmitMethod() {
    return {
      method: options.submitMethod || submitData.beacon,
    };
  }
}

test('after calling startTimer, periodically invokes harvest', function (t) {
  resetSpies();
  var calls = 0;

  var scheduler = new HarvestScheduler(
    'endpoint',
    { onFinished: onFinished, getPayload: getPayload },
    aggregator.sharedContext
  );
  scheduler.startTimer(0.1);

  function getPayload() {
    return { body: {} };
  }

  function onFinished() {
    calls++;
    if (calls > 1) {
      scheduler.stopTimer();
      validate();
    }
  }

  function validate() {
    t.equal(harv.Harvest.prototype.send.callCount, 2, 'harvest was initiated more than once');
    t.end();
  }
});

test('scheduleHarvest invokes harvest once', function (t) {
  resetSpies();

  var scheduler = new HarvestScheduler('endpoint', { getPayload: getPayload }, aggregator.sharedContext);
  scheduler.scheduleHarvest(0.1);

  function getPayload() {
    return { body: {} };
  }

  setTimeout(validate, 1000);

  function validate() {
    t.equal(harv.Harvest.prototype.send.callCount, 1, 'harvest was initiated once');
    t.end();
  }
});

test('when getPayload is provided, calls harvest.send', function (t) {
  resetSpies();
  var scheduler = new HarvestScheduler(
    'endpoint',
    { onFinished: onFinished, getPayload: getPayload },
    aggregator.sharedContext
  );
  scheduler.startTimer(0.1);

  function getPayload() {
    return { body: {} };
  }

  function onFinished() {
    scheduler.stopTimer();
    t.ok(harv.Harvest.prototype.send.called, 'harvest.send was called');
    t.notOk(harv.Harvest.prototype.sendX.called, 'harvest.sendX was not called');
    t.end();
  }
});

test('when getPayload is not provided, calls harvest.sendX', function (t) {
  resetSpies();
  var scheduler = new HarvestScheduler('endpoint', { onFinished: onFinished }, aggregator.sharedContext);
  scheduler.startTimer(0.1);

  function onFinished() {
    scheduler.stopTimer();
    t.notOk(harv.Harvest.prototype.send.called, 'harvest.send was not called');
    t.ok(harv.Harvest.prototype.sendX.called, 'harvest.sendX was called');
    t.end();
  }
});

test('does not call harvest.send when payload is null', function (t) {
  resetSpies();
  var scheduler = new HarvestScheduler('endpoint', { getPayload: getPayload }, aggregator.sharedContext);
  scheduler.startTimer(0.1);

  function getPayload() {
    setTimeout(validate, 0);
    return null;
  }

  function validate() {
    scheduler.stopTimer();
    t.notOk(harv.Harvest.prototype.send.called, 'harvest.send was not called');
    t.notOk(harv.Harvest.prototype.sendX.called, 'harvest.sendX was not called');
    t.end();
  }
});

test('provides retry to getPayload when submit method is xhr', function (t) {
  resetSpies({ submitMethod: submitData.xhr });

  var scheduler = new HarvestScheduler('endpoint', { getPayload: getPayload }, aggregator.sharedContext);
  scheduler.startTimer(0.1);

  function getPayload(opts) {
    scheduler.stopTimer();
    setTimeout(function () {
      var call = harv.Harvest.prototype.send.getCall(0);
      t.equal(call.args[3].method, submitData.xhr, 'method was xhr');
      t.ok(opts.retry, 'retry was set to true');
      t.end();
    }, 0);
    return { body: {} };
  }
});

test('when retrying, uses delay provided by harvest response', function (t) {
  resetSpies({
    response: { sent: true, retry: true, delay: 0.2 },
  });
  sinon.spy(HarvestScheduler.prototype, 'scheduleHarvest');

  var scheduler = new HarvestScheduler(
    'endpoint',
    { onFinished: onFinished, getPayload: getPayload },
    aggregator.sharedContext
  );
  scheduler.scheduleHarvest(0.1);

  var count = 0;
  function getPayload() {
    return { body: {} };
  }

  function onFinished(result) {
    count++;
    if (count > 1) {
      scheduler.stopTimer();
      validate();
    }
  }

  function validate() {
    t.equal(HarvestScheduler.prototype.scheduleHarvest.callCount, 2);
    var call = HarvestScheduler.prototype.scheduleHarvest.getCall(0);
    t.equal(call.args[0], 0.1);
    call = HarvestScheduler.prototype.scheduleHarvest.getCall(1);
    t.equal(call.args[0], 0.2);
    t.end();
  }
});
