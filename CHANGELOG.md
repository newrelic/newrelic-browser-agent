## v1208

* Staging release date: 03/10/2021
* Production APM-injected release date: 03/11/2021
* Production Standalone release date: 03/22/2021

### Retry harvest network requests

The agent retries harvest XHR requests when it receives 408, 429, 500 or 503 response codes.

### File protocol disallowed

The agent will not report any data when it is on a page opened from a local file.

## v1198

* Staging release date: 01/29/2021
* Production APM-injected release date: 02/01/2021
* Production Standalone release date: 02/08/2021

### Send metrics harvest as POST body

The agent now sends JS errors and AJAX metrics data as body of a standard XHR request. 

## v1194

* Staging release date: 01/07/2021
* Production APM-injected release date: 01/11/2021
* Production Standalone release date: 01/19/2021

### Optimized instrumentation of promises

The promise instrumentation has been updated to reduce performance overhead on web sites that use a large number of promises.

### Fixed issue with SPA overhead

In a rare case where large number of callbacks are executed at the end of an interaction, the agent could cause a significant overhead. This has been fixed in this version of the agent.

### Fixed issue with Fetch instrumentation

Added handling for the use of fetch with a URL object.


## v1177

* Staging release date: 08/18/2020
* Production APM-injected release date: 08/19/2020
* Production Standalone release date: 08/26/2020

### [Timing] Added pageHide and windowLoad PageViewTiming events

The agent now reports two additional types of timing values as PageViewTiming events - pageHide and windowLoad. The `pageHide` value represents the first time that the page was hidden (e.g. by switching browser tab). Note that we only collect the first pageHide events at this point. This timing is useful alongside with its CLS (Cumulative Layout Shift) attribute.

In addition, the agent now also collects the legacy window load value as a PageViewTiming event. This is useful to query and visualize this metric alongside other types of timing events.

### [Timing] Added Cumulative Layout Shift

The agent now collects CLS (Cumulative Layout Shift) values as attributes on PageViewTiming events. CLS measures how much layout of the page shifts and is represented as a score. All types of PageViewTiming events (except FP and FCP) include this attribute, showing the score up until the point the timing measurement was taken.

### [Timing] Fixed unrealistic high values for First Interaction

Older browsers report Event.timeStamp as an epoch time instead of value relative to the page navigation start. The agent took this into account for FID (First Input Delay) timing values but not for FI (First Interaction), which goes hand in hand with FID. With this fix, there should no longer be unrealistic outlier values for FI values.

## v1173

* Staging release date: 07/23/2020
* Production APM-injected release date: 07/28/2020
* Production Standalone release date: 08/03/2020

### [DT] W3C TraceContext headers

The agent can now use the W3C TraceContext headers in addition to and instead of the newrelic proprietary header.

## v1169

* Staging release date: 05/20/2020
* Production APM-injected release date: 05/28/2020
* Production Standalone release date: 06/01/2020

### [Privacy] Added ability to enable/disable cookies

The agent now accepts new configuration `privacy.cookies_enabled`. When it is set to false, the agent does not write any cookies, and it also notifies the intake server to not return a cookie. This enables customers to comply with GDPR privacy rules around cookies.

### [xhr] Fixed issue with document XHR requests

In some cases, the agent was causing a DOMException error when getting size of XHR responses for requests with `document` response type.

## v1167

* Staging release date: 02/07/2020
* Production APM-injected release date: 02/07/2020
* Production Standalone release date: 02/07/2020

### [Timing] Fixed a script error on old IE browsers

Resolved a bug that caused a script error when the windowUnload event fired. This issue affected only Internet Explorer prior to version 9.

## v1163

* Staging release date: 02/03/2020

### [Timing] Largest Contentful Paint

The agent is now capturing Largest Contentful Paint (LCP) as a new type of the PageViewTiming event. For more information about LCP, see [this article](https://web.dev/lcp/) from Google.

### [Timing] Window Unload timing

The agent is now capturing the timing of the [Window unload](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event) event as a new type of the PageViewTiming event.

### [XHR] Fixed capturing response size for requests with *ms-stream* response type

Requests with ms-stream data were previously causing errors in the agent.

## v1158

* Staging release date: 12/18/2019
* Lite release date (US): 12/19/2019
* Lite release date (EU): 12/19/2019
* Pro / Enterprise release date: 12/19/2019
* Standalone/Current release date: 12/30/2019

### [DT] Distributed Tracing for cross-origin AJAX calls

The agent can now add the `newrelic` DT header to outgoing cross-origin AJAX calls. The origins that the agent should add headers to must be defined in the `distributed_tracing.allowed_origins` configuration section.

## v1153

* Staging release date: 11/08/2019
* Lite release date (US): 11/14/2019
* Lite release date (EU): 11/19/2019
* Pro / Enterprise release date: 11/19/2019
* Standalone/Current release date: 11/21/2019

### [Timing] New PageViewTiming Event to capture User Centric Perceived Performance metrics in real time

With this release, we are tying together the visual and responsiveness performance for our customer's site. With every page view, the agent is now capturing the time of the first interaction along with FID (First Input Delay). The existing paint timing metrics (First Paint and First Contentful Paint) are now collected even when they occur after the load event. All of these new metrics are captured on the new PageViewTiming events, available in Insights. This new event type is available for all agents, but requires a Browser Pro subscription.

### [DT] Distributed Tracing for same-origin AJAX calls

The agent can now capture Span events for DT traces. This is accomplished by adding the custom `newrelic` header to outgoing AJAX calls. In this release, the agent adds this header only to same-origin requests. The feature must be enabled using the `distributed_tracing` configuration section.

## v1149

* Staging release date: 11/01/2019
* Lite release date: 11/05/2019

### [Timing] Added First Interaction with delay (FID), improved FP and FCP accuracy

With every page view, the agent is now capturing the time of the first interaction along with FID (First Input Delay). The existing paint timing metrics (FP and FCP) are now collected even when they occur after the load event. All of these new metrics are captured on the new PageViewTiming events in Insights.

### [SPA] Browser interactions now wait on external scripts to finish loading

Browser interactions measure the time of all Javascript code that runs as a result of an interaction. The agent now includes the time it takes to load and execute external scripts. This is useful, for example, when the code started by an interaction must be loaded first (lazy loading).

## v1130

* Staging release date: 07/11/2019
* Lite release date: 07/16/2019
* Pro / Enterprise release date: 07/18/2019
* Standalone/Current release date: 07/25/2019

### [RUM][SPA] First Paint and First Contentful Paint values are now being collected

For browsers that implement the Paint Timing API, the agent will now collect paint timing values and make them available as attributes on the PageView and BrowserInteraction (initial-load only) events.

### [SPA] Updated instrumentation of the History API

The history API methods are now instrumented on the History object constructor.  This is to ensure that our instrumentation does not override other libraries that wrap these methods.

### [SPA] Updated instrumentation of DOM API methods

The DOM API methods used for JSONP instrumentation are now instrumented on the Node object prototype (as opposed to HTMLElement lower in the prototype chain). This is to ensure that our instrumentation does not override other libraries that wrap these methods.

## v1123

* Staging release date: 04/17/2019
* Lite release date: 04/19/2019
* Pro / Enterprise release date: 04/19/2019
* Standalone/Current release date: 04/26/2019

### [XHR] Fixed capturing status code for Angular apps

Angular calls abort() on the XHR object after it successfully finishes.  This was seen by our instrumentation as a call that did not finish, and as a result status code was set to `0`.  This fix addresses this use case by capturing status code earlier in the call stack.

## v1118

* Staging release date: 01/02/2019
* Lite release date: 01/04/2019
* Pro / Enterprise release date: 01/08/2019
* Standalone/Current release date: 01/14/2019

### [ERR] Custom attributes are now included on JavascriptError events.

This includes custom attributes added using the setCustomAttribute(), interaction.setAttribute(), and noticeError() APIs.

### [API] The noticeError() API now accepts custom attributes as an additional argument.

### [RUM] The page URL query param now contains value of the URL at the time the RUM call is made

Currently, we are using the referer header value from the RUM call for transaction naming and for URL attributes on Insights events.  The agent also sends the URL value as a query parameter with the RUM call to get around HTTP header stripping.  This update brings the query parameter value on a par with the HTTP header by capturing it at the time the RUM request is made (to account for redirects).

## v1099

* Staging release date: 10/02/2018
* Lite release date: 10/04/2018
* Pro / Enterprise release date: 10/08/2018
* Standalone/Current release date: 10/17/2018

### [SPA] Action Text

The agent now captures the text of the HTML element that was clicked when a browser interaction started.  This value is stored as an attribute called actionText on the BrowserInteraction events.

There is also a new API `actionText`, which can be used to manually set the action text value.

### [Harvest] The agent now uses a fallback method for collecting data when sendBeacon fails

Browsers can return false from sendBeacon call when it cannot be completed.  The agent now detects it and falls back to a different method to ensure data is captured.

### [ERR] Fixed calculating stackHash value in Safari 10 and 11

The stackHash value was not being properly calculated for global errors in Safari 10 and 11, causing incorrect grouping of errors across all browsers.

### [SPA] Fixed issue with calling fetch without any arguments

On certain versions of the Safari browser, calling fetch without any arguments is permitted.  Other browsers, in contrast, do not allow this and throw an error.  This also prevented the agent from working properly.

### [SPA] Removed response size calculation for streaming fetch calls

Previously, the agent cloned the response of a fetch call and read the response body in order to capture its size.  In certain versions of the Safari browser this caused other clone calls to fail.  As a result, the agent now only uses the `content-length` header, when available, to capture response size.

## v1071

* Staging release date: 11/14/2017
* Lite release date: 11/28/2017
* Pro / Enterprise release date: 12/04/2017
* Standalone/Current release date: 12/08/2017

### [SPA] Add JS Errors to Browser Interactions

When a JS error occurs inside a browser interaction event, the error will now be
associated with the interaction via Insights attributes. The JavaScriptError Insights
event will have `browserInteractionId` and `parentEventId` attributes, and BrowserInteraction,
AjaxRequest and BrowserTiming events will have `browserInteractionId`, `eventId`, and `parentEventId`
attributes.

### [SPA] Fixed JSONP Safari bug

Previously, the agent would cause Safari browsers to lock up when JSONP requests
returned large data. The agent no longer calculates JSONP response size.
https://newrelic.atlassian.net/browse/JS-3486

## v1059

* Staging release date: 09/27/2017
* Lite release date: 10/02/2017
* Pro / Enterprise release date: 10/04/2017
* Standalone/Current release date: 10/11/2017

### [SPA] Add JSONP Support

Browser Interactions that include JSONP requests are now correctly tracked.
Previously, browser interactions that included JSONP were ended early and not
included in the `Breakdowns` tab.

### [SPA] Fixed a compatibility issue with zone.js

When New Relic and Zone.js v0.8.13 were used together, the context (`this`) was not
being set correctly in `addEventListener` calls.

### [Harvest] Correctly send data when methods aren't wrappable

When XHR was not wrappable, the agent did not send data to the collector via XHR.
We are now correctly sending the data if XHR exists on the page, even if it's not
wrappable.

## v1044

* Staging release date: 06/30/17
* Lite release date: 07/05/17
* Pro / Enterprise release date: 07/10/17 1:20PM Pacific
* Standalone/Current release date: 07/17/17 9:15AM Pacific

### [SPA] Improve aggregator performance

The agent verifies interactions are complete by setting and clearing multiple
timers. Previously, the agent would make many unnecessary calls to clearTimeout,
and will noow only clear timers when appropriate.

### [STN] Protect against custom events

When the agent determine the event origin for Session Traces. In some libraries,
that use custom event wrappers, when the agent calls `target` on an event it can
throw an exception. The agent will now catch the exception when building the
Session Traces.

## v1039

* Staging release date: 06/08/17
* Lite release date: 06/13/17
* Pro / Enterprise release date: 06/15/17
* Standalone/Current release date: 06/22/17

### [SPA] Do not instrument SPA without wrappable XHR

On a mobile Safari browser all XHR's are not wrappable, resulting in errors in our agent. This change will no longer instrument SPA on these devices.

### [setTimeout] Support setTimeout with a string duration

When you call `setTimeout` with a string as the duration, browsers will cast this as a number, but the agent did not handle this correctly. We are now handling this case correctly.

### [XHR] Work around mutation observer memory leak in IE 11

We have discovered that MutationObserver in IE causes a memory leak, so the agent now will prefer `setImmediate` for IE, and use a resolved promise to schedule the wrapping in Edge (and other browsers that support promises).

### [SPA] Handle short recursive timers

Some libraries recursively set timers that left our interactions open. The agent now handles this by reducing the max time allowable to be included in the interaction.

## v1026

* Staging release date: 03/07/17
* Lite release date: 03/09/17
* Pro / Enterprise release date: 03/13/17
* Standalone/Current release date: 03/20/17

### [INS] Increase harvest interval from 10s to 30s

Currently, we limit PageAction events to 120 per page load and only 20 events per harvest cycle, resulting in
dropped data if a user sends more than 20 pageAction events in a single burst. Increasing the harvest time
to 30 seconds also increases the event buffer, allowing users to send up to 60 events per harvest.

### Improve data accuracy by using a monotonic clock

The agent uses the system clock to calculate some timings, and since the system clock can change
over the lifecycle of a page, the agent will occasionally report inaccurate or unexpectedly negative values.
Going forward, the agent will use `perfomance.now()`, which is a monotonically increasing clock that starts
from navigationStart. This change will result in more accurate timing for modern browsers.

### [wrap-event] Preserve event listener functions when the agent doesn't load correctly

`add-` and `removeEventListener` should function the same whether the agent is present or not. This change completes
the bug fix from v993.

## v1016

* Staging release date: 01/06/17
* Lite release date: 01/10/17
* Pro / Enterprise release date: 01/13/17
* Standalone release date: 01/19/17
* Current release date: 01/19/17

### [Sourcemaps] Release ID's API Renamed

The release api was renamed from `addReleaseId` to `addRelease`, however the arguments did not change.

### [submit-data] XHR With Credentials

Previously, when the agent would send data using an XHR, it would feature-check the `withCredentials` property and set it to `true` if it was available. However, older versions of IE do not allow modification of the `withCredentials` property on unsent XHRs. The agent now wraps the property assignment in a try/catch block to prevent errors.

## v1009

* Staging release date: 11/18/16
* Lite release date: TBD
* Pro / Enterprise release date: TBD
* Standalone release date: TBD
* Current release date: TBD

### Release ID's API

A new API was added that allows the client to inform us what version of their JavaScript is currently being ran, so they can access a richer error feature by helping match up which source maps can be used.

### Scroll Listener

Previously, the wrapped scroll event listener did not take advantage of an available performance optimization: the passive annotation. By including this annotation, our wrapped scroll listener will allow a non-blocking, smooth scrolling action.

## v998

* Staging release date: 10/27/16
* Lite release date: 11/1/16
* Pro / Enterprise release date: 11/3/16
* Standalone release date: 11/10/16
* Current release date: 11/10/16

### [EE] - Fixed how we handle backlog draining

A series of changes created an issue that caused the event-emitter to drop the
backlog after 30 seconds.

## v995

* Staging release date: 10/4/16
* Lite release date: 10/5/16
* Pro / Enterprise release date: 10/10/16
* Standalone release date: TBD
* Current release date: TBD

### [wrap-event] Fixed a bug with addEventListener wrapping introduced in v993.

Previously Objects implementing the EventListener interface which were registered for multiple events, could only be removed for the last event they were registered for.

## v993

* Staging release date: 9/22/16
* Lite release date: TBD
* Pro / Enterprise release date: TBD
* Standalone release date: TBD
* Current release date: TBD

### [EE] Fixed a compatibility issue with zone.js

Previously when the agent and zone.js were both included on a page, additional
event handlers would be triggered twice. For example, when event handlers were
added as properties, such as `onreadystatechange`, these handlers would be
triggered twice in some browsers.  This issue has now been resolved.

### [wrap-function] Fixed a bug with cross-frame callbacks

Previously, when adding event handlers for events in iframes, the agent
would attempt to wrap the provided callbacks. When the wrapping logic called
the callback belonging to another frame, a permissions exception would be
thrown. The agent will now only wrap callbacks created in the same frame.

### [EE] Agent no longer leaks memory when it does not load correctly

Previously, the agent would continue to buffer events to be processed and
harvested, even if the aggregator portion of the agent failed to load.  The agent
now will clear the buffers and stop emitting events if it detects a failure, or
if the rum request has not completed within 30 seconds of the load event.

### [INS] Agent no longer mutates the attributes object passed to the `addPageAction` API

Previously the agent would mutate the attributes object passed to add page actions
by adding the default and page attributes onto this object.

### [API] Added the `setCurrentRouteName` API method

The agent now has an api method to set the current route name for the page.
This api can be used to set the `previousRouteName` and `targetRouteName` for
`BrowserInteraction` events.

### [Harvest] Disabled insecure communication with the router

Previously the agent would send rum data to the router without TLS if the
request was initiated from an insecure page.  Now the agent will always use
TLS connection when transmitting data.

## v974

* Staging release date: 8/16/2016
* Lite release date: 8/18/2016
* Pro / Enterprise release date: 8/18/2016
* Standalone release date: 8/24/2016
* Current release date: 8/24/2016

This release adds a new setErrorHandler api to agent which allows
applications to see the errors collected by the agent, and optionally
ignore them.

## v971

* Staging release date: 8/10/2016
* Lite release date: 8/15/2016
* Pro / Enterprise release date: 8/17/2016
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Add support for keyboard change events

Browser interaction events are now triggered by keyboard events as part of
creating the interaction.

### Change harvest to not use sendBeacon

We now use the `sendBeacon` native API only for page unload.
This api restricts the amount of data it can send, so we will use
xhr when it is available and save `sendBeacon` for `unload` events.

### [SPA] Browser Timing Events now have Traced Callback Duration

We started sending back traced callback durations with the browser timing
events. This is to match the attributes of other events.

## v963

* Staging release date: 7/5/2016
* Lite release date: 7/6/2016
* Pro / Enterprise release date: 7/7/2016
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Finalize the browser interaction api

Previously the browser interaction api was only available in
the spa loader used by our beta customers. The stubs for the api
are now available in all loaders to allow switching between
loaders without worrying about calling unavailable apis.

### [SPA] Remove stubs for deprecated interaction api

Previously the browser interaction stubbed out a deprecated version
of the interaction api that was used briefly by beta customers. In
this release this deprecated api is being removed completely.

#### [SPA] Update fetch instrumentation

Previously the agent did not properly wrap the fetch api during
browser interactions. The agent now correctly wraps fetch, and the
the body getter methods on Request and Response objects. It also
correctly clones the fetch body before it is used to insure the agent
can correctly measure responseBodySize.

### [SPA] Support hash-based routing

Previously, SPAs that used hash-based routing would need to use
the API to get meaningful names for their route change data,
because the agent would strip the fragment from a URL and save
only the path. The agent now sends the hash part of the fragment
along with the path by default.

### [SPA] Add queueTime and appTime

The addition of queueTime and appTime provides application timing
data for breakdown charts by passing through server-side timing
attributes.

### [SPA] Fix Promise wrapping in Firefox 38

In Firefox 38, copying the toString method from the native Promise
class throws an error. The agent now returns a String representation
of the original promise function, rather than throwing an error.

## v952

* Staging release date: 6/3/16
* Lite release date: 6/6/16
* Pro / Enterprise release date: 6/10/16
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Update to bel.3 schema

SPA agents now send data using the latest schema, and will now
send navTiming data for initial page loads, and more detailed data
for ajax requests including status codes, and requests/response body
sizes.

## v943

* Staging release date: 5/2/16
* Lite release date: 5/4/16
* Pro / Enterprise release date: 5/5/16
* Standalone release date: 6/6/16
* Current release date: 6/6/16

### Explicitly report the current URL when collection data

When sending data to the router, all requests will now include a new
query parameter which will contain the current url of the page. Previously
the consumer used the referer header to determine the url of the page data
was being collected for. This caused issues for sites that set a referrer-policy
meta tag.

### [SPA] Redesign of the API for SPA

All spa api methods are now attached to an interaction handle returned
by calling newrelic.interaction(). This handle will be bound to the interaction
that was active when it was first created.  The goal of this refactor is to
allow more usecases to be handled by the api, and to reduce confusion caused
by not knowing when an interaction is active.

### Fix recording of PageAction events from newrelic.finished() calls

The `newrelic.finished()` API call now again correctly records a `PageAction`
event with an `actionName` of 'finished' when it is invoked.

### [SPA] Allow endInteraction calls before the window load event

Previously, calling `newrelic.endInteraction` prior to the dispatching of the
window load event would cause SPA interactions after the initial page load to
not be submitted. This has been fixed.

### [SPA] Fix for bogus 'popstate' interactions during page load

Previous versions of our SPA instrumentation would generate bogus
`BrowserInteraction` events with a `trigger` of `popstate` when the hash was
changed during the initial page load interaction in some browsers. This has been
fixed.

### [SPA] Smaller interaction payloads

Previously, each call to `setTimeout` or `setImmediate` that was recorded as
part of an SPA interaction would be sent as a separate record as part of the
data submitted for the interaction. For applications with lots of calls to
`setTimeout(..., 0)`, this would result in unnecessarily large data payloads
being sent to New Relic.

Callbacks passed to `setTimeout` or `setImmediate` will now have their callback
timings rolled into the callback timings of the parent tracer that they were
spawned by instead, reducing the size of the submitted data for each
interaction.

### [SPA] Fix serialization of interaction data containing custom attributes

When a custom attribute with a value of 'undefined' was attached via the
`setInteractionAttribute` or `setCustomAttribute` APIs, any browser interactions
containing that attribute would fail to be serialized correctly, and would thus
not produce `BrowserInteraction` events. This has been fixed.

## v918

* Standalone release date: 5/4/16
* Current release date: 5/4/16

### Fix zone.js compatibility for window.addEventListener wrapping

The way that the JS agent was previously wrapping window.addEventListener was
incompatible with the wrapping approach used by zone.js, which could lead to
breakage of Angular 2 applications, particularly with respect to popstate
handling. This has been fixed.

### Fix wrapping of onreadystatechange callbacks

Previously, the agent's instrumentation of callbacks assigned via the XHR
onreadystatechange property could cause those callbacks to not fire in some
circumstances. Among other things, this affected the firing of some callbacks
passed to jQuery.ajax. This has been fixed, and our test coverage of this area
improved.

## v910

### Fix errors with Angular 2.x applications

Previous versions of the SPA loader would cause a JS error on page load when
used with Angular 2.x applications, due to a conflict with the zone.js library
which is a dependency of Angular 2.x. This has been fixed.

### Introducing initial page load timing

The agent currently measures the page load duration as the time between
navigationStart and the window load event, which is often a poor proxy for load
time as experienced by the user.

The agent now provides another measure of initial page load timing that includes
time spent waiting on XHRs and timers that don't resolve until after the window
load event, and should be a more accurate reflection of user-perceived wait
time.

This new timing is captured in the 'duration' attribute of BrowserInteraction
events with a category of 'Initial page load'. It is currently only availble
when using the SPA loader variant.

### More reliable detection of hash changes in IE and Edge

When instrumenting single-page web applications, the agent relies on detecting
changes to the URL that are made by updating window.location.hash, or by
using the history API in order to determine whether a given interaction should
be counted as a route change or not.

Previously, route changes accomplished through direct assignments to
window.location.hash might not be captured correctly in IE and Edge, but this
has now been fixed.

## v892

### Restore reporting of URLs with JS errors

Version 885 introduced a regression wherein the agent would fail to report URLs
on individual JS error records. This would mean that JS errors might have been
assigned a URL based on the URL at the time they were submitted, rather than the
time they were recorded. This has been fixed.

### Report jsDuration for BrowserInteraction Events

This release bumps the querypack schema version to `bel.2` which adds support
for jsDuration for browser interactions.  It also removes the children property
from attribute nodes, and removes the className property from elementData nodes.

## v885

### Fix instrumentation memory leak

v862 introduced a memory leak in the core event buffering machinery of the
agent, which has been fixed in this release. The JS agent loader buffers events
to be consumed when the aggregator loads, but these buffers were not being
correctly destroyed starting in v862 when events were buffered using the
internal `handle` mechanism.

### Reduce noise in BrowserInteration event data

During development of the SPA feature, we collected data for many different
types of user interaction. Many of these interactions are redundant (ie: mouseup,
mousedown, and click), and added unnecessary noise into the event data. We now
collect data for a subset of user interactions: click, submit, and popstate.

## v881 (Not publicly released)

### Properly account for XHR callbacks made with jQuery.ajax

Previously, the agent would not correctly time XHR callbacks that were set up
using `jQuery.ajax`. It would also fail to include these XHR callbacks in SPA
interactions. This has been fixed.

### Fix duration on SPA BrowserInteraction events

v862 included a bug in the quality of our data collection, resulting in
recording all BrowserInteraction events with a duration of 0 seconds. The agent
now records the correct duration, and had improved test coverage of expected
data.

### Improved SPA custom instrumentation API

The previous SPA custom instrumentation API included two methods with
confusingly similar signatures for tracking asynchronous and synchronous work.
To reduce potential confusion, the two methods have been merged into a single,
more general method: `newrelic.createTracer`.

### Improve support for SPA hash-based routing

Previously, Dirac events would only be written for interactions that resulted
in a route change, but that determination would be made by URL comparison
in the Consumer after the fragment identifier had already been removed by the
agent. Route changes that resulted in changes within the fragment only would be
ignored by the Consumer. Now, the determination of a valid route change is
made in the agent before the fragment is removed, and sent as a flag to the
Consumer.

### Move SPA-specific API methods to SPA loader

Previously, new non-finalized SPA-specific API methods were available in all
loaders. Now, the SPA-specific API will only be available for applications that
opt in to SPA instrumentation by using the SPA loader.

### Fixed SPA interaction early-end timing in Edge

In Edge, some SPA interactions involving Promises might previously have ended
prematurely. This has been fixed.

## v862 (Not publicly released)

### noticeError API now accepts a String argument

Previously, the noticeError API would only accept an Error object. Now,
a user can send either an Error object or a String to the noticeError
endpoint.

### Expanded API for Single-Page-App interaction tracing

Added new methods for attaching custom attributes to traced interactions, ending
interactions early, adding custom segments to interactions, and assigning
custom names to interactions.

These APIs are not yet considered stable and may change before the SPA feature
is released.

### Experimental click-tracking support

The agent now includes a new loader variant called 'cap', which adds
experimental support for capturing clicks as Insights events. This loader
variant is not selectable in the UI, and should currently only be used for
testing purposes.

## v852

### Use sendBeacon to harvest data on page unload when possible

In browsers that support it, the agent will now use `navigator.sendBeacon` to
harvest buffered data on page unload, rather than using a dummy image tag. A
related, issue wherein the next page load could be delayed in Firefox if data
submission took a long time has been fixed.

### Fixed data submission upon navigating away from pages in Safari 9

In Safari 9, pages with `unload` event handlers are allowed into the WebKit page
cache, meaning that those `unload` handlers may never fire. Since the agent
previously relied upon an `unload` handler to submit data when navigating away
from a page, this meant that data submission upon navigating away from a page in
Safari 9 was unreliable. This has been fixed by submitting data from the
`pagehide` event handler instead when possible.

### Improved performance for XHRs with responseType=json

Previously, XHRs requested with responseType='json' would trigger the agent to
parse and re-serialize the response in order to measure the size of the response
body. This could be a performance issue with large JSON responses requested with
responseType='json'. The agent will now instead use XHR progress events to
measure response size in most browsers.

### Remove call to deprecated prefixed function in Chrome 46

A deprecation warning caused by calling `webkitClearResourceTimings` in Chrome 46+
has been fixed (we now prefer the un-prefixed version of this function if
available).

### Fix Access Denied error in >= IE10 compatibility mode

An Access Denied error was thrown when users were running >= IE10 in <= IE9
compatibility mode. The error was caused by submitting session trace data
from a browser that does not support CORS. The agent will now only attempt
session trace collection from browsers with known, working CORS support.

## v793 (non-public release)

### Alpha support for single-page web applications

This version of the agent adds a new 'spa' loader which contains initial support
for tracking route changes within single-page web applications.

## v768

### Fix compatibility with pace.js and rollbar.js

The 3rd-party pace.js and rollbar.js libraries previously would interfere with
New Relic's instrumentation of XMLHttpRequests, causing the 'AJAX' section of
the browser UI to be empty. Compatibility with both of these libraries has been
fixed.

### Improved session trace behavior when window.Event is overwritten

Previously, when application code overwrote the window.Event global, session
traces would be missing entries for event and timer callbacks, and internal
errors would be generated in the agent, leading to unnecessary CPU usage by the
agent when instrumenting high-frequency events. This has been fixed.

## v741

### Fix long hangs when serializing errors containing circular references

When attempting to serialize information about JS errors containing circular
references in their 'message' property, the agent would previously hang for a
long period of time, and then eventually fail to report the error. This has been
fixed.

## v686

### Query string parameters are now stripped from JS error backtraces

Query string parameters on URLs included within JS error backtraces will now be
removed before error information is transmitted to New Relic. In addition,
backtrace frames that reference inline scripts will be reported as 'inline',
rather than the URL of the HTML resource.

### Faster PageAction harvests

PageAction events are now harvested more quickly - every 10s, rather than
every 60s.

### Guard against incorrect monkey-patching of XMLHttpRequest

Some JS libraries monkey-patch XMLHttpRequest in such a way that the `async`
parameter will end up as `false` rather than `true` by default if unspecified.
To work around this, the agent now specifies the value of the `async` flag
explicitly to ensure that its XHRs are asynchronous.
