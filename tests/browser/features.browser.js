/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../tools/jil/browser-test')
const {setup} = require('./utils/setup')
const {activateFeatures} = require('../../packages/browser-agent-core/common/util/feature-flags') // main test file #1
import {modules as featName, buildToFeatsList, stageFeatures, aggChecklist} from '../../cdn/agent-aggregator/util/features'  // main test file #2
import {getEnabledFeatures} from '../../packages/browser-agent-core/common/util/enabled-features' // helper for #2
import agentIdentifier from '../../cdn/shared/agentIdentifier'  // required import from #2 setup
import * as pageViewEventM from '../../packages/browser-agent-core/features/page-view-event/aggregate'
import * as pageViewTimingM from '../../packages/browser-agent-core/features/page-view-timing/aggregate'
import * as metricsM from '../../packages/browser-agent-core/features/metrics/aggregate'
import * as jsErrorsM from '../../packages/browser-agent-core/features/jserrors/aggregate'
import * as ajaxM from '../../packages/browser-agent-core/features/ajax/aggregate'
import * as pageActionM from '../../packages/browser-agent-core/features/page-action/aggregate'
import * as sessionTraceM from '../../packages/browser-agent-core/features/session-trace/aggregate'
import * as spaM from '../../packages/browser-agent-core/features/spa/aggregate'

const {baseEE} = setup(agentIdentifier);
const modules = {
  [featName.pageViewEvent]: pageViewEventM,
  [featName.pageViewTiming]: pageViewTimingM,
  [featName.metrics]: metricsM,
  [featName.jsErrors]: jsErrorsM,
  [featName.ajax]: ajaxM,
  [featName.pageAction]: pageActionM,
  [featName.sessionTrace]: sessionTraceM,
  [featName.spa]: spaM
}

test('activate features ', function (t) {
  var featFooCallbacks = 0
  var featBarCallbacks = 0
  baseEE.on('feat-foo', function () { featFooCallbacks += 1 })
  baseEE.on('feat-bar', function () { featBarCallbacks += 1 })

  t.plan(2)
  activateFeatures(null, agentIdentifier) // should trigger nothing
  activateFeatures({foo: 0, bar: 1}, agentIdentifier) // should only trigger feat-bar
  activateFeatures({foo: 0, bar: 1}, agentIdentifier) // should not trigger another feat-bar

  t.equal(featFooCallbacks, 0, 'foo should never be activated')
  t.equal(featBarCallbacks, 1, 'bar should only be activated once')
})

/**
 * Mimic function from "features.js"
 * @param {string} build - one of ["lite", "pro", "spa"]
 * @returns - ultimately the aggregators structure from test file
 */
function mockImportFeatures(build) {
  const enabledFeatures = getEnabledFeatures(agentIdentifier)
  for (const featureName of buildToFeatsList[build]) {
    if (enabledFeatures[featureName.replace(/-/g, '_')]) aggChecklist.notInitialized[featureName] = modules[featureName].Aggregate
  }
  return stageFeatures()
}
/**
 * Helper function for the features test below
 * @param {aggregator Object} aggChecklist 
 * @param {*} t 
 */
function checkEverythingInitialized(aggChecklist, t) {
  let notInitLen = Object.keys(aggChecklist.notInitialized).length, stagedLen = Object.keys(aggChecklist.staged).length;
  t.notOk(notInitLen, `${notInitLen} features left in 'notInitialized'.`);
  t.notOk(stagedLen, `${stagedLen} features left in 'staged'.`);
}

test("initializing features - lite", function (t) {
  let aggregators = mockImportFeatures("lite");

  checkEverythingInitialized(aggregators, t);
  t.ok(aggregators.initialized[featName.metrics], `"${featName.metrics}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.pageViewEvent], `"${featName.pageViewEvent}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.pageViewTiming], `"${featName.pageViewTiming}" expected to be initialized.`);
  t.notOk(aggregators.initialized[featName.jsErrors], `"${featName.jsErrors}" was not initialized in this build.`);

  t.end();
})

test("initializing features - pro", function (t) {
  let aggregators = mockImportFeatures("pro");

  checkEverythingInitialized(aggregators, t);
  t.ok(aggregators.initialized[featName.pageViewEvent], `"${featName.pageViewEvent}" expected to be initialized.`); // check 1 from 'lite'
  t.ok(aggregators.initialized[featName.jsErrors], `"${featName.jsErrors}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.ajax], `"${featName.ajax}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.sessionTrace], `"${featName.sessionTrace}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.pageAction], `"${featName.pageAction}" expected to be initialized.`);
  t.notOk(aggregators.initialized[featName.spa], `"${featName.spa}" was not initialized in this build.`); // check none from 'spa'

  t.end();
})

test("initializing features - spa", function (t) {
  let aggregators = mockImportFeatures("spa");

  checkEverythingInitialized(aggregators, t);
  t.ok(aggregators.initialized[featName.metrics], `"${featName.metrics}" expected to be initialized.`); // check 1 from 'lite'
  t.ok(aggregators.initialized[featName.jsErrors], `"${featName.jsErrors}" expected to be initialized.`); // check 2 from 'pro' -- these ones are "dependencies"
  t.ok(aggregators.initialized[featName.ajax], `"${featName.ajax}" expected to be initialized.`);
  t.ok(aggregators.initialized[featName.spa], `"${featName.spa}" expected to be initialized.`); // check only feat of 'spa'

  t.end();
})
