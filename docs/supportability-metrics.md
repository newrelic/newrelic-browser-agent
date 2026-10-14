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

### Configuration
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
  <!--- a feature's aggregate failed to load or to be constructed, so that feature was aborted --->
  * Internal/Error/Feature-Load
  <!--- evaluating the init object for the Config metrics failed --->
  * Internal/Error/Config-Metrics
  <!--- the session replay compressor failed to load, so replay runs uncompressed --->
  * Internal/Error/SessionReplay-Compressor
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

### Warnings
<!--- The agent warned the page about something, each time it did. <code> is the number of the warning in docs/warning-codes.md. Only the code is reported, never the details of the warning --->
* Warn/<code>/Seen
  <!--- An error occurred while setting a property of a Configurable. --->
  * Warn/1/Seen
  <!--- An error occurred while setting a Configurable. --->
  * Warn/2/Seen
  <!--- Setting a Configurable requires an object as input. --->
  * Warn/3/Seen
  <!--- Setting a Configurable requires a model to set its initial properties. --->
  * Warn/4/Seen
  <!--- An invalid session_replay.mask_selector was provided. * will be used. --->
  * Warn/5/Seen
  <!--- An invalid session_replay.block_selector was provided and will not be used. --->
  * Warn/6/Seen
  <!--- An invalid session_replay.mask_input_option was provided and will not be used. --->
  * Warn/7/Seen
  <!--- Shared context requires an object as input. --->
  * Warn/8/Seen
  <!--- An error occurred while setting SharedContext. --->
  * Warn/9/Seen
  <!--- Failed to read from storage API. --->
  * Warn/10/Seen
  <!--- Failed to write to the storage API. --->
  * Warn/11/Seen
  <!--- An obfuscation replacement rule was detected missing a "regex" value. --->
  * Warn/12/Seen
  <!--- An obfuscation replacement rule contains a "regex" value with an invalid type (must be a string or RegExp). --->
  * Warn/13/Seen
  <!--- An obfuscation replacement rule contains a "replacement" value with an invalid type (must be a string). --->
  * Warn/14/Seen
  <!--- An error occurred while intercepting XHR. --->
  * Warn/15/Seen
  <!--- Could not cast log message to string. --->
  * Warn/16/Seen
  <!--- Could not calculate New Relic server time. Agent shutting down. --->
  * Warn/17/Seen
  <!--- RUM call failed. Agent shutting down. --->
  * Warn/18/Seen
  <!--- SPA scheduler is not initialized. Saved interaction is not sent! --->
  * Warn/19/Seen
  <!--- A problem occurred when starting up session manager. This page will not start or extend any session. --->
  * Warn/20/Seen
  <!--- Failed to initialize the agent. Could not determine the runtime environment. --->
  * Warn/21/Seen
  <!--- Failed to initialize all enabled instrument classes (agent aborted) - --->
  * Warn/22/Seen
  <!--- An unexpected issue occurred. --->
  * Warn/23/Seen
  <!--- Something prevented the agent from instrumenting. --->
  * Warn/24/Seen
  <!--- Something prevented the agent from being downloaded. --->
  * Warn/25/Seen
  <!--- Failed to initialize instrument classes. --->
  * Warn/26/Seen
  <!--- Downloading runtime APIs failed... --->
  * Warn/27/Seen
  <!--- The Browser Agent is attempting to send a very large payload. This is usually tied to large amounts of custom attributes. Please check your configurations. --->
  * Warn/28/Seen
  <!--- Failed to wrap logger: invalid argument(s). --->
  * Warn/29/Seen
  <!--- Invalid log level. --->
  * Warn/30/Seen
  <!--- Ignored log: Log is larger than maximum payload size. --->
  * Warn/31/Seen
  <!--- Ignored log: Invalid message. --->
  * Warn/32/Seen
  <!--- Session Replay Aborted. --->
  * Warn/33/Seen
  <!--- Downloading and initializing a feature failed... --->
  * Warn/34/Seen
  <!--- Call to agent api failed. The API is not currently initialized. --->
  * Warn/35/Seen
  <!--- A feature is enabled but one or more dependent features have not been initialized. This may cause unintended consequences or missing data... --->
  * Warn/36/Seen
  <!--- Invalid feature name supplied. --->
  * Warn/37/Seen
  <!--- Call to api was made before agent fully initialized. --->
  * Warn/38/Seen
  <!--- Failed to execute setCustomAttribute. Name must be a string type. --->
  * Warn/39/Seen
  <!--- Failed to execute setCustomAttribute. Non-null value must be a string, number or boolean type. --->
  * Warn/40/Seen
  <!--- Failed to execute setUserId. Non-null value must be a string type. --->
  * Warn/41/Seen
  <!--- Failed to execute setApplicationVersion. Expected <String | null>. --->
  * Warn/42/Seen
  <!--- Agent not configured properly. --->
  * Warn/43/Seen
  <!--- Invalid object passed to generic event aggregate. Missing "eventType". --->
  * Warn/44/Seen
  <!--- An internal agent process failed to execute. --->
  * Warn/45/Seen
  <!--- A reserved eventType was provided to recordCustomEvent(...) -- The event was not recorded. --->
  * Warn/46/Seen
  <!--- We tried to access a stylesheet's contents but failed due to browser security. For best results, ensure that cross-domain CSS assets are decorated with "crossorigin='anonymous'" attribution or are otherwise publicly accessible. --->
  * Warn/47/Seen
  <!--- Supplied an invalid API target. Must be an <Object> that contains valid (string) id and name properties. --->
  * Warn/48/Seen
  <!--- Supplied API target is missing an entityGuid. Some APIs may not behave correctly without a valid entityGuid (ex. logs). --->
  * Warn/49/Seen
  <!--- Failed to connect. Cannot allow registered API. --->
  * Warn/50/Seen
  <!--- Container agent is not available to register with. Can not connect. --->
  * Warn/51/Seen
  <!--- Unexpected problem encountered. There should be at least one app for harvest! --->
  * Warn/52/Seen
  <!--- Failed to parse connect response. --->
  * Warn/53/Seen
  <!--- An experimental feature is being used. Support can not be offered for issues. --->
  * Warn/54/Seen
  <!--- Register API has been disabled on the container agent. --->
  * Warn/55/Seen
  <!--- Could not find a matching entity to store data. --->
  * Warn/56/Seen
  <!--- Failed to execute measure. Arguments must have valid types. --->
  * Warn/57/Seen
  <!--- Failed to execute measure. Resulting duration must be non-negative. --->
  * Warn/58/Seen
  <!--- Session replay harvested before a session trace payload could be sent. This could be problematic for replays that rely on a trace. --->
  * Warn/59/Seen
  <!--- Session trace aborted. --->
  * Warn/60/Seen
  <!--- Timestamps must be non-negative and end time cannot be before start time. --->
  * Warn/61/Seen
  <!--- Timestamp must be a unix timestamp greater than the page origin time. --->
  * Warn/62/Seen
  <!--- A single event was larger than the maximum allowed payload size. --->
  * Warn/63/Seen
  <!--- Required globals have been mutated before being accessed by the browser agent. This can cause issues and should be avoided. --->
  * Warn/64/Seen
  <!--- Consent API argument must be boolean or undefined. --->
  * Warn/65/Seen
  <!--- A new agent session has started. --->
  * Warn/66/Seen
  <!--- The "spa" feature has been deprecated and disabled. Please use/import "soft_navigations" instead for tracking of BrowserInteraction data. --->
  * Warn/67/Seen
  <!--- API has been deregistered and can no longer be used. Call "register" API again with credentials to start over. --->
  * Warn/68/Seen
  <!--- More than one Browser agent is running on the page. --->
  * Warn/69/Seen
  <!--- A session replay payload failed to send and is being retried. Recording is paused during the retry period, and will resume when a successful harvest is made. Some replay activity may be missed during retry phases. --->
  * Warn/70/Seen
  <!--- An invalid feature mode was detected and set to "off". --->
  * Warn/71/Seen
  <!--- RegisteredIframeEntity failed to transmit API data from an iframe to window context. --->
  * Warn/72/Seen
  <!--- RegisteredIframeEntity failed to register with window context. --->
  * Warn/73/Seen
  <!--- RegisteredIframeEntity rejected message from unauthorized origin. --->
  * Warn/74/Seen
  <!--- RegisteredIframeEntity rejected message with mismatched iframeInterfaceId. --->
  * Warn/75/Seen
  <!--- Agent rejected post message, could not match with existing entity. --->
  * Warn/76/Seen
  <!--- Agent rejected post message, could not validate origin. --->
  * Warn/77/Seen
  <!--- RegisteredIframeEntity could not determine parent origin and will not register, to avoid trusting messages from any origin. --->
  * Warn/78/Seen
  <!--- Unable to initialize Connector and/or Harvester. --->
  * Warn/79/Seen
  <!--- An invalid manifest option was provided to register() and will be ignored. --->
  * Warn/80/Seen
  <!--- Entities were detected that share a name with different IDs - This can cause multiple entities to have the same name in New Relic. --->
  * Warn/81/Seen
  <!--- Entities were detected that share an ID with different names - This can cause your entity's name to change unexpectedly. --->
  * Warn/82/Seen

### Audit
<!--- Cross-event audit of the page_view `hasReplay` flag against whether that harvest actually occurred --->
* audit/page_view/hasReplay/<outcome>
  <!--- The flag was set, but no harvest occurred --->
  * audit/page_view/hasReplay/false/positive
  <!--- The flag was not set, but a harvest occurred --->
  * audit/page_view/hasReplay/false/negative
  <!--- The flag was set, and a harvest occurred --->
  * audit/page_view/hasReplay/true/positive
  <!--- The flag was not set, and no harvest occurred --->
  * audit/page_view/hasReplay/true/negative
<!--- Cross-event audit of the page_view `hasTrace` flag against whether that harvest actually occurred --->
* audit/page_view/hasTrace/<outcome>
  <!--- The flag was set, but no harvest occurred --->
  * audit/page_view/hasTrace/false/positive
  <!--- The flag was not set, but a harvest occurred --->
  * audit/page_view/hasTrace/false/negative
  <!--- The flag was set, and a harvest occurred --->
  * audit/page_view/hasTrace/true/positive
  <!--- The flag was not set, and no harvest occurred --->
  * audit/page_view/hasTrace/true/negative
<!--- Cross-event audit of the session_replay `hasError` flag against whether that harvest actually occurred --->
* audit/session_replay/hasError/<outcome>
  <!--- The flag was set, but no harvest occurred --->
  * audit/session_replay/hasError/false/positive
  <!--- The flag was not set, but a harvest occurred --->
  * audit/session_replay/hasError/false/negative
  <!--- The flag was set, and a harvest occurred --->
  * audit/session_replay/hasError/true/positive
  <!--- The flag was not set, and no harvest occurred --->
  * audit/session_replay/hasError/true/negative

### Harvester
<!--- Harvester retried a harvest --->
* Harvester/Retry/Attempted/<feature>
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/ajax
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/generic_events
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/jserrors
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/logging
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/metrics
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/page_view_event
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/page_view_timing
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/session_replay
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/session_trace
  <!--- Harvester retried a harvest --->
  * Harvester/Retry/Attempted/soft_navigations
<!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
* Harvester/Retry/Failed/<code>
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/408
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/429
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/500
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/502
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/503
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/504
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/512
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/513
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/514
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/515
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/516
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/517
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/518
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/519
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/520
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/521
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/522
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/523
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/524
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/525
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/526
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/527
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/528
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/529
  <!--- A retried harvest failed again with the HTTP status code of the harvest that was retried --->
  * Harvester/Retry/Failed/530
<!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
* Harvester/Retry/Succeeded/<code>
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/408
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/429
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/500
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/502
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/503
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/504
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/512
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/513
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/514
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/515
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/516
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/517
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/518
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/519
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/520
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/521
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/522
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/523
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/524
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/525
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/526
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/527
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/528
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/529
  <!--- A retried harvest succeeded. The code is the HTTP status of the harvest that was retried --->
  * Harvester/Retry/Succeeded/530

### Browser Connect Response Metrics
<!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
* BCS/Error/<code>
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/0
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/400
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/401
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/403
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/404
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/405
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/408
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/413
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/414
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/429
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/500
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/502
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/503
  <!--- HTTP status code of failed browser connect response. Reported for any status of 400 or more, and for 0 (a request that never completed). Only the codes a customer is likely to see are listed --->
  * BCS/Error/504
<!--- Total dropped payload size of failed browser connect response Reports a value (bytes). --->
* BCS/Error/Dropped/Bytes
<!--- Response time of failed browser connect response Reports a value (ms). --->
* BCS/Error/Duration/Ms
