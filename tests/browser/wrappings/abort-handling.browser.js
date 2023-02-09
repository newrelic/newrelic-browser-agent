const jil = require('jil')
const {setup} = require('../utils/setup')
import { Instrument as JserrorsInstrument } from '../../../src/features/jserrors/instrument/index'	// use jserror feature as easy example

const {agentIdentifier, aggregator} = setup()
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalOnerrorHandler = window.onerror;

JserrorsInstrument.prototype.importAggregator = function () {
	this.abortHandler();	// mock aggregator failure - handler should be defined when this is called
};

jil.browserTest("ensure abort behaves properly", function(t) {
	const inst = new JserrorsInstrument(agentIdentifier, aggregator, false);

	t.equal(window.onerror, originalOnerrorHandler, "global error handler net unmodified after abort");
	t.equal(window.requestAnimationFrame, originalRequestAnimationFrame, "global api (RAF) restored after abort");
	t.equal(inst.abortHandler, undefined, "abort handler is removed so it cannot be called again");
	t.end();
});