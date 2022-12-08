const test = require('../../tools/jil/browser-test')
const {setup} = require('./utils/setup')
import {ee} from '@newrelic/browser-agent-core/src/common/event-emitter/contextual-ee'
import { onWindowLoad } from '@newrelic/browser-agent-core/src/common/window/load'
import agentIdentifier from '../../cdn/shared/agentIdentifier'
import {stageAggregator} from '../../cdn/agent-loader/utils/importAggregator'
import {Instrument} from '@newrelic/browser-agent-core/src/features/page-view-event/instrument/index'

const {} = setup(agentIdentifier);
new Instrument(agentIdentifier);

/* There's no need to mock a failed feature import, as the original production code, e.g.:
    > import(`@newrelic/browser-agent-core/features/${featureName}/aggregate`)
    will naturally fail with a "cannot find module" in browser tests.
*/

test("import features failure", function (t) {
  stageAggregator("lite");

  onWindowLoad(function () {
    setTimeout(() => {
      t.ok(ee.aborted, "global EE is aborted");
      t.end();
    }, 0)
  });
})
