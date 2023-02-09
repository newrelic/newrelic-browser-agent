const jil = require('jil')
const {setup} = require('../utils/setup')
// We use these two wrappers because one of them calls the other which facilitates this test.
const {wrapEvents, unwrapEvents} = require('../../../src/common/wrap/wrap-events')
const {wrapXhr, unwrapXhr} = require('../../../src/common/wrap/wrap-xhr')

const {baseEE} = setup()
const originalXHRObj = window.XMLHttpRequest;
const originalAEL = window.addEventListener;

jil.browserTest("unwrap order does not affect dependencies wrapping counts", function(t) {
	wrapEvents(baseEE);	// AEL wrap count = 1;
	t.notEqual(window.addEventListener, originalAEL, "event listener is wrapped, +1 (A)");

	wrapXhr(baseEE);	// AEL = 2; XHR wrap count = 1;
	wrapXhr(baseEE);	// XHR = 2;	-- Notice AEL does NOT increment because XHR only wraps events too on the *first* time XHR is wrapped.
	t.notEqual(window.XMLHttpRequest, originalXHRObj, "XMLHttpRequest is wrapped(x2), +2 (B)");

	unwrapXhr(baseEE);	// expect: XHR = 1; AEL = 2 (no change);
	t.notEqual(window.XMLHttpRequest, originalXHRObj, "XMLHttpRequest is *still* wrapped after unwrap(x1), -1 (B)");

	unwrapEvents(baseEE);	// expect: AEL = 1; XHR = 1 (no change);
	t.notEqual(window.addEventListener, originalAEL, "event listener is *still* wrapped after unwrap, (A) undone");

	unwrapXhr(baseEE);	// expect AEL = 0; XHR = 0;
	t.equal(window.XMLHttpRequest, originalXHRObj, "XMLHttpRequest back to original, (B) undone");
	t.equal(window.addEventListener, originalAEL, "event listener back to original, (B) undone");

	wrapEvents(baseEE);	// expect AEL = 0 still
	wrapXhr(baseEE);	// expect XHR = 0 still
	t.equal(window.addEventListener, originalAEL, "re-wrapping an unwrapped API (event) must not work (isn't supported)");
	t.equal(window.XMLHttpRequest, originalXHRObj, "and for XMLHttpRequest too");
	t.end();
});