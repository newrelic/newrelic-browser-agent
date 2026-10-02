# Supportability Metrics
---
## What/Why
Supportability metrics are intended to be used to give internal value through analysis of patterns, typically by occurrence or by value.

## How
A timeslice metric is harvested to the JSE/XHR consumer. An aggregation service called Angler aggregates metrics against known labels once per hour and reports a new event with the aggregation findings to a dedicated account.

## Adding or changing a metric
This file is generated from `tools/supportability-metrics/registry.js`. Do not edit it by hand. Add the metric to the registry and run `npm run supportability-metrics:generate-docs`. The pre-commit hook and CI run `npm run supportability-metrics:check`, which fails if `src/` emits a metric the registry does not cover, or the registry lists a metric that is never emitted.

Tags below are shown without the `Browser/Supportability/` prefix.

### WebSockets
<!--- WebSocket completed event was received (count) --->
* WebSocket/Completed/Seen
<!--- WebSocket completed event payload size in bytes Reports a value (bytes). --->
* WebSocket/Completed/Bytes

### User Actions
<!--- A user action has been detected as a rage click --->
* UserAction/RageClick/Seen
<!--- A user action has been detected as a dead click --->
* UserAction/DeadClick/Seen
<!--- A user action has been detected as an error click --->
* UserAction/ErrorClick/Seen

### Session
<!--- Another page was running at the same time and already updated the session state --->
* Session/RaceCondition/Seen

### AJAX
<!--- Ajax Events were Excluded because they matched the Agent beacon --->
* Ajax/Events/Excluded/Agent
<!--- Ajax metrics were Excluded because they matched the Agent beacon --->
* Ajax/Metrics/Excluded/Agent
<!--- Ajax Events were Excluded because they matched the Customer deny list --->
* Ajax/Events/Excluded/App
<!--- Ajax metrics were Excluded because they matched the Customer deny list --->
* Ajax/Metrics/Excluded/App
<!--- Number of bytes added to reported Ajax events by including request/response body, header, and query payload attributes Reports a value (bytes). --->
* Ajax/Events/Payload/Bytes-Added

### Generic
<!--- The agent was initialized with this loader type --->
* Generic/LoaderType/<type>/Detected
  <!--- Generic Agent Loader Was Initialized (NPM) --->
  * Generic/LoaderType/agent/Detected
  <!--- Browser Agent Loader Was Initialized (NPM) --->
  * Generic/LoaderType/browser-agent/Detected
  <!--- MicroAgent Loader Was Initialized --->
  * Generic/LoaderType/micro-agent/Detected
  <!--- Experimental Loader Was Initialized --->
  * Generic/LoaderType/experimental/Detected
  <!--- Lite Agent Loader Was Initialized --->
  * Generic/LoaderType/lite/Detected
  <!--- Pro Agent Loader Was Initialized --->
  * Generic/LoaderType/pro/Detected
  <!--- Spa Agent Loader Was Initialized --->
  * Generic/LoaderType/spa/Detected
<!--- The agent was distributed this way --->
* Generic/DistMethod/<method>/Detected
  <!--- CDN Distribution Method was Initialized --->
  * Generic/DistMethod/CDN/Detected
  <!--- NPM Distribution Method was Initialized --->
  * Generic/DistMethod/NPM/Detected
<!--- Agent script element was decorated with nonce attribute --->
* Generic/Runtime/Nonce/Detected
<!--- Agent running in an IFrame was Detected --->
* Generic/Runtime/IFrame/Detected
<!--- Agent is running in a local file --->
* Generic/FileProtocol/Detected
<!--- Obfuscation rules were Detected --->
* Generic/Obfuscate/Detected
<!--- Current page was restored out of the BF Cache --->
* Generic/BFCache/PageRestored
<!--- A Performance.resource event was observed --->
* Generic/Performance/Resource/Seen
<!--- A first party Performance.resource event was observed --->
* Generic/Performance/FirstPartyResource/Seen
<!--- A New Relic Performance.resource event was observed --->
* Generic/Performance/NrResource/Seen
<!--- The browser being controlled by webDriver was detected --->
* Generic/WebDriver/Detected
<!--- Invalid timestamp seen in processing RUM response Reports a value (ms). --->
* Generic/TimeKeeper/InvalidTimestamp/Seen
<!--- Performance.now and Date APIs have drifted (forward only by >1000ms). Drift value is reported alongside count. Only reported once per page load Reports a value (ms). --->
* Generic/TimeKeeper/ClockDrift/Detected

### Frameworks
<!--- A supported framework was detected on the page --->
* Framework/<name>/Detected
  <!--- React was Detected --->
  * Framework/React/Detected
  <!--- NextJS was Detected --->
  * Framework/NextJS/Detected
  <!--- Vue was Detected --->
  * Framework/Vue/Detected
  <!--- NuxtJS was Detected --->
  * Framework/NuxtJS/Detected
  <!--- Angular was Detected --->
  * Framework/Angular/Detected
  <!--- AngularUniversal was Detected --->
  * Framework/AngularUniversal/Detected
  <!--- Svelte was Detected --->
  * Framework/Svelte/Detected
  <!--- SvelteKit was Detected --->
  * Framework/SvelteKit/Detected
  <!--- Preact was Detected --->
  * Framework/Preact/Detected
  <!--- PreactSSR was Detected --->
  * Framework/PreactSSR/Detected
  <!--- AngularJS was Detected --->
  * Framework/AngularJS/Detected
  <!--- Backbone was Detected --->
  * Framework/Backbone/Detected
  <!--- Ember was Detected --->
  * Framework/Ember/Detected
  <!--- Meteor was Detected --->
  * Framework/Meteor/Detected
  <!--- Zepto was Detected --->
  * Framework/Zepto/Detected
  <!--- Jquery was Detected --->
  * Framework/Jquery/Detected
  <!--- MooTools was Detected --->
  * Framework/MooTools/Detected
  <!--- Qwik was Detected --->
  * Framework/Qwik/Detected
  <!--- Flutter was Detected --->
  * Framework/Flutter/Detected
  <!--- Electron was Detected --->
  * Framework/Electron/Detected

### Configuration (generated from init)
Every setting in `init` is reported automatically by its path, with no per-setting code. Angler's tag list decides which are surfaced, so a new init setting only needs a new Angler tag to show up in dashboards and queries.
<!--- A boolean init setting that is true. Path mirrors init, e.g. init.session_replay.collect_fonts -> Config/session_replay/collect_fonts/Enabled. Absence means disabled. Settings a feature flag can also turn on (e.g. api.register.enabled) read as Enabled for either route --->
* Config/<init path>/Enabled
<!--- A non-boolean init setting that differs from its default. The value is never sent --->
* Config/<init path>/Changed

### Feature Flags
<!--- A feature flag was present in init.feature_flags. One metric per flag, named by the flag (e.g. Feature_Flag/rum_v2/Seen) --->
* Feature_Flag/<flag>/Seen

### Session Replay
<!--- SessionReplay was Enabled but the RUM response indicated it was not entitled to run --->
* SessionReplay/EnabledNotEntitled/Detected
<!--- SessionReplay attempted to harvest data --->
* SessionReplay/Harvest/Attempts
<!--- SessionReplay aborted. An abort reason with no tag is reported as `undefined`, which indicates a bug at the call site Reports a value (bytes, only for Too-Big). --->
* SessionReplay/Abort/<reason>
  <!--- SessionReplay Aborted after a natural Session reset --->
  * SessionReplay/Abort/Reset
  <!--- SessionReplay Aborted because the recording modules could not be imported --->
  * SessionReplay/Abort/Import
  <!--- SessionReplay Aborted because the Agent is currently being rate limited --->
  * SessionReplay/Abort/Too-Many
  <!--- SessionReplay Aborted because the request was too large to send through vortex --->
  * SessionReplay/Abort/Too-Big
  <!--- SessionReplay Aborted because another open tab Aborted for any reason --->
  * SessionReplay/Abort/Cross-Tab
  <!--- SessionReplay Aborted because the App was not entitled to record --->
  * SessionReplay/Abort/Entitlement
<!--- SessionReplay detected missing inline CSS contents Reports a value (count). --->
* SessionReplay/Payload/Missing-Inline-Css/<outcome>
  <!--- SessionReplay Detected missing inline CSS contents and could not fix them --->
  * SessionReplay/Payload/Missing-Inline-Css/Failed
  <!--- SessionReplay Detected missing inline CSS contents but was able to fix them --->
  * SessionReplay/Payload/Missing-Inline-Css/Fixed
  <!--- SessionReplay Detected missing inline CSS contents but skipped fixing them due to configuration --->
  * SessionReplay/Payload/Missing-Inline-Css/Skipped
<!--- Bytes of an rrweb event, by rrweb event type Reports a value (bytes). --->
* rrweb/node/<type>/bytes
  <!--- node type 1 = Preload --->
  * rrweb/node/1/bytes
  <!--- node type 2 = Full snapshot --->
  * rrweb/node/2/bytes
  <!--- node type 3 = Incremental snapshot --->
  * rrweb/node/3/bytes
  <!--- node type 4 = Meta --->
  * rrweb/node/4/bytes

### API
<!--- A public API method was called. Any method set up with setupAPI is reported automatically, so a new API is captured without further code --->
* API/<name>/called
  <!--- newrelic.start() was called --->
  * API/start/called
  <!--- newrelic.recordReplay() was called --->
  * API/recordReplay/called
  <!--- newrelic.pauseReplay() was called --->
  * API/pauseReplay/called
  <!--- newrelic.createTracer() was called --->
  * API/createTracer/called
  <!--- newrelic.setErrorHandler() was called --->
  * API/setErrorHandler/called
  <!--- newrelic.finished() was called --->
  * API/finished/called
  <!--- newrelic.addToTrace() was called --->
  * API/addToTrace/called
  <!--- newrelic.addRelease() was called --->
  * API/addRelease/called
  <!--- newrelic.addPageAction() was called --->
  * API/addPageAction/called
  <!--- newrelic.setCurrentRouteName() was called --->
  * API/setCurrentRouteName/called
  <!--- newrelic.setPageViewName() was called --->
  * API/setPageViewName/called
  <!--- newrelic.setCustomAttribute() was called --->
  * API/setCustomAttribute/called
  <!--- newrelic.interaction() was called --->
  * API/interaction/called
  <!--- newrelic.noticeError() was called --->
  * API/noticeError/called
  <!--- newrelic.setUserId() was called --->
  * API/setUserId/called
  <!--- newrelic.setApplicationVersion() was called --->
  * API/setApplicationVersion/called
  <!--- newrelic.interaction().actionText() was called --->
  * API/actionText/called
  <!--- newrelic.interaction().setName() was called --->
  * API/setName/called
  <!--- newrelic.interaction().setAttribute() was called --->
  * API/setAttribute/called
  <!--- newrelic.interaction().save() was called --->
  * API/save/called
  <!--- newrelic.interaction().ignore() was called --->
  * API/ignore/called
  <!--- newrelic.interaction().onEnd() was called --->
  * API/onEnd/called
  <!--- newrelic.interaction().getContext() was called --->
  * API/getContext/called
  <!--- newrelic.interaction().end() was called --->
  * API/end/called
  <!--- newrelic.interaction().get() was called --->
  * API/get/called
  <!--- newrelic.log() was called --->
  * API/log/called
  <!--- newrelic.wrapLogger() was called --->
  * API/wrapLogger/called
  <!--- newrelic.measure() was called --->
  * API/measure/called
  <!--- newrelic.consent() was called --->
  * API/consent/called
  <!--- newrelic.recordCustomEvent() was called --->
  * API/recordCustomEvent/called
  <!--- newrelic.register() was called --->
  * API/register/called
<!--- newrelic.setUserId() was called with resetSession = true that successfully executed --->
* API/setUserId/resetSession/called
<!--- A method on the object returned by newrelic.register() was called --->
* API/register/<method>/called
  <!--- newrelic.register().addPageAction() was called --->
  * API/register/addPageAction/called
  <!--- newrelic.register().deregister() was called --->
  * API/register/deregister/called
  <!--- newrelic.register().log() was called --->
  * API/register/log/called
  <!--- newrelic.register().measure() was called --->
  * API/register/measure/called
  <!--- newrelic.register().noticeError() was called --->
  * API/register/noticeError/called
  <!--- newrelic.register().register() was called --->
  * API/register/register/called
  <!--- newrelic.register().recordCustomEvent() was called --->
  * API/register/recordCustomEvent/called
  <!--- newrelic.register().setApplicationVersion() was called --->
  * API/register/setApplicationVersion/called
  <!--- newrelic.register().setCustomAttribute() was called --->
  * API/register/setCustomAttribute/called
  <!--- newrelic.register().setUserId() was called --->
  * API/register/setUserId/called

### Internal Errors
Reported as `Internal/Error/<reason>`. The reason is the second argument of the `internal-error` event, and falls back to `Other` when none is given.
<!--- An internal error was swallowed instead of being reported to the customer --->
* Internal/Error/<reason>
  <!--- a generalized internal error relating to rrweb processing was observed, typically thrown by rrweb's error handler. Also assigned when an error's leading frame is in the recorder or rrweb --->
  * Internal/Error/Rrweb
  <!--- an internal error relating to rrweb processing tied to the security policy (or disabled browser APIs that are out of our control) was observed --->
  * Internal/Error/Rrweb-Security-Policy
  <!--- the session replay recorder module failed to import --->
  * Internal/Error/SessionReplay-Import
  <!--- the session replay recorder failed to start recording --->
  * Internal/Error/SessionReplay-Record
  <!--- the session manager failed to set up --->
  * Internal/Error/Session-Setup
  <!--- waiting on the RUM response flags failed in a feature aggregate --->
  * Internal/Error/RumFlags
  <!--- JSON.stringify failed in the agent's stringify utility --->
  * Internal/Error/Stringify
  <!--- an error occurred wrapping XMLHttpRequest --->
  * Internal/Error/Wrap-XHR
  <!--- an error occurred emitting events from a wrapped function --->
  * Internal/Error/Wrap-Function
  <!--- an error occurred in the ajax instrumentation (fetch, XHR response handling) --->
  * Internal/Error/Ajax-Instrument
  <!--- an error occurred processing a Performance resource timing entry --->
  * Internal/Error/GenericEvents-Resource
  <!--- an internal error was observed without a reason --->
  * Internal/Error/Other

### Event Buffer
<!--- The number of bytes dropped because an event buffer reached its cap Reports a value (bytes). --->
* EventBuffer/<feature>/Dropped/Bytes
  <!--- The number of bytes dropped across all features because an event buffer reached its cap --->
  * EventBuffer/Combined/Dropped/Bytes
  <!--- The number of bytes dropped for ajax because an event buffer reached its cap --->
  * EventBuffer/ajax/Dropped/Bytes
  <!--- The number of bytes dropped for generic_events because an event buffer reached its cap --->
  * EventBuffer/generic_events/Dropped/Bytes
  <!--- The number of bytes dropped for logging because an event buffer reached its cap --->
  * EventBuffer/logging/Dropped/Bytes
  <!--- The number of bytes dropped for page_view_event because an event buffer reached its cap --->
  * EventBuffer/page_view_event/Dropped/Bytes
  <!--- The number of bytes dropped for page_view_timing because an event buffer reached its cap --->
  * EventBuffer/page_view_timing/Dropped/Bytes
  <!--- The number of bytes dropped for spa because an event buffer reached its cap --->
  * EventBuffer/spa/Dropped/Bytes
  <!--- The number of bytes dropped for soft_navigations because an event buffer reached its cap --->
  * EventBuffer/soft_navigations/Dropped/Bytes

### Harvest
<!--- A feature harvest was sent before the interval elapsed (bytes captured) Reports a value (bytes). --->
* <feature>/Harvest/Early/Seen
  <!--- ajax harvest was sent before the interval elapsed (bytes captured) --->
  * ajax/Harvest/Early/Seen
  <!--- generic_events harvest was sent before the interval elapsed (bytes captured) --->
  * generic_events/Harvest/Early/Seen
  <!--- logging harvest was sent before the interval elapsed (bytes captured) --->
  * logging/Harvest/Early/Seen
  <!--- page_view_timing harvest was sent before the interval elapsed (bytes captured) --->
  * page_view_timing/Harvest/Early/Seen
  <!--- soft_navigations harvest was sent before the interval elapsed (bytes captured) --->
  * soft_navigations/Harvest/Early/Seen
  <!--- spa harvest was sent before the interval elapsed (bytes captured) --->
  * spa/Harvest/Early/Seen

### Audit
<!--- Cross-event audit of a harvest flag against whether that harvest actually occurred. <result> is positive or negative; <flag value> is true when the flag matched reality. Currently: page_view/hasReplay, page_view/hasTrace and session_replay/hasError, each with false/positive (flag set, no harvest), false/negative (flag unset, harvest occurred), true/positive and true/negative --->
* audit/<feature>/<flag>/<flag value>/<result>

### Harvester
<!--- Harvester retried a harvest --->
* Harvester/Retry/Attempted/<feature>
<!--- Retry failed codes (dynamic) --->
* Harvester/Retry/Failed/<code>
<!--- Retry succeeded codes (dynamic) --->
* Harvester/Retry/Succeeded/<code>

### Browser Connect Response Metrics
<!--- HTTP status code of failed browser connect response --->
* BCS/Error/<code>
<!--- Total dropped payload size of failed browser connect response Reports a value (bytes). --->
* BCS/Error/Dropped/Bytes
<!--- Response time of failed browser connect response Reports a value (ms). --->
* BCS/Error/Duration/Ms
