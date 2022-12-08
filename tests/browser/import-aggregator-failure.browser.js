const test = require('../../tools/jil/browser-test')
const {setup} = require('./utils/setup')
import {ee} from '@newrelic/browser-agent-core/src/common/event-emitter/contextual-ee'
import { onWindowLoad } from '@newrelic/browser-agent-core/src/common/window/load'
import {stageAggregator} from '../../cdn/agent-loader/utils/importAggregator'
import * as testAggregatorM from '../../cdn/agent-aggregator/aggregator'
import {Instrument} from '@newrelic/browser-agent-core/src/features/page-view-event/instrument/index'

const {agentIdentifier} = setup();
new Instrument(agentIdentifier);

/**
 * Falsifying some network error while attempting to load main aggregator (and all feature aggs). This is a level above previous features test.
 */
testAggregatorM.aggregator = async function(build) {
  throw new Error("(Fake) A network error occurred importing 'aggregator.js'.");
}
test("import main aggregator failure", function (t) {
  stageAggregator("lite");

  onWindowLoad(function () {
    setTimeout(() => {
      t.ok(ee.aborted, "global EE is aborted");
      t.end();
    }, 0)
  });
})
