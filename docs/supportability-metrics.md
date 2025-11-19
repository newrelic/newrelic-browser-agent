# Supportability Metrics
---
## What/Why
Supportability metrics are intended to be used to give internal value through analysis of patterns, typically by occurrence or by value.

## How
A timeslice metric is harvested to the JSE/XHR consumer. An aggregation service called Angler aggregates metrics against known labels once per hour and reports a new event with the aggregation findings to a dedicated account.

### WebSockets
<!--- WebSocket new class was made, ms from page origin --->
* WebSocket/New/Ms
<!--- WebSocket new class was made, ms from class init --->
* WebSocket/New/MsSinceClassInit

<!--- WebSocket send method was called, ms from page origin --->
* WebSocket/Send/Ms
<!--- WebSocket send method was called, ms from class init --->
* WebSocket/Send/MsSinceClassInit
<!--- WebSocket send method was called, bytes from args --->
* WebSocket/Send/Bytes

<!--- WebSocket was cleanly closed, ms from page origin --->
* WebSocket/Close-Clean/Ms
<!--- WebSocket was cleanly closed, ms from class init --->
* WebSocket/Close-Clean/MsSinceClassInit
<!--- WebSocket was uncleanly closed, ms from page origin --->
* WebSocket/Close-Dirty/Ms
<!--- WebSocket was uncleanly closed, ms from class init --->
* WebSocket/Close-Dirty/MsSinceClassInit
  
<!--- WebSocket message event was received, ms from page origin --->
* WebSocket/Message/Ms
<!--- WebSocket message event was received, ms from class init --->
* WebSocket/Message/MsSinceClassInit
<!--- WebSocket message event was received, bytes from args --->
* WebSocket/Message/Bytes
  
<!--- WebSocket error event was received, ms from page origin --->
* WebSocket/Error/Ms
<!--- WebSocket error event was received, ms from class init --->
* WebSocket/Error/MsSinceClassInit
  
<!--- WebSocket open event was received, ms from page origin --->
* WebSocket/Open/Ms
<!--- WebSocket open event was received, ms from class init --->
* WebSocket/Open/MsSinceClassInit

### Logging
<!--- Logging harvest was too big to send --->
* Logging/Harvest/Failed/Seen
<!--- Logging harvest was sent before the interval elapsed --->
* Logging/Harvest/Early/Seen
<!--- Logging event was dropped due to sampling --->
* Logging/Event/Dropped/Sampling
<!--- Logging event was dropped due to failed string casting --->
* Logging/Event/Dropped/Casting
<!--- Logging event added to the buffer --->
* Logging/Event/Added/Seen
<!--- Logging event added to the buffer via API --->
* Logging/Event/API/Added
<!--- Logging event added to the buffer via auto-instrumentation --->
* Logging/Event/Auto/Added
<!--- Logging feature was aborted due to reset -->
* Logging/Abort/Reset
<!--- Logging harvest was sent before the interval elapsed --->

### Generic Events
<!--- GenericEvents harvest had too many nodes and sent early --->
* GenericEvents/Harvest/Max/Seen

### User Actions
<!-- A user action has been detected as a rage click --->
* UserAction/RageClick/Seen
<!-- A user action has been detected as a dead click --->
* UserAction/DeadClick/Seen
<!-- A user action has been detected as an error click --->
* UserAction/ErrorClick/Seen

### Session
<!--- Session has ended due to max time limit reached --->
* Session/Expired/Seen
<!--- Session has ended due to inactivity time limit reached --->
* Session/Inactive/Seen
<!--- Duration of Session at time of ending --->
* Session/Duration/Ms
<!--- Capture SMs for Session trace if active (ptid is set when returned byReplay ingest). Retain these SMs while we are working through the Session_replay Feature --->
* PageSession/Feature/SessionTrace/Duration/Ms
<!--- A Session Replay was discarded due to session expiration --->
* Session/Expired/SessionReplay/Seen
<!--- A Session Trace was discard due to session expiration --->
* Session/Expired/SessionTrace/Seen
* Session/Disabled/MissingPerformanceNavigationTiming/Seen

### AJAX
<!--- Ajax Events were Excluded because they matched the Agent beacon --->
* Ajax/Events/Excluded/Agent
<!--- Ajax metrics were Excluded because they matched the Agent beacon --->
* Ajax/Metrics/Excluded/Agent
<!--- Ajax Events were Excluded because they matched the Customer deny list --->
* Ajax/Events/Excluded/App
<!--- Ajax metrics were Excluded because they matched the Customer deny list --->
* Ajax/Metrics/Excluded/App
<!--- Number of bytes added to reported Ajax event bodies by adding GQL metadata --->
* Ajax/Events/GraphQL/Bytes-Added
<!--- Observed Ajax calls contained a CrossApplicationTracing header --->
* Ajax/CrossApplicationTracing/Header/Seen

### Generic
<!--- Generic Agent Loader Was Initialized (NPM) --->
* Generic/LoaderType/agent/Detected
<!--- Browser Agent Loader Was Initialized (NPM) --->
* Generic/LoaderType/browser-agent/Detected
<!--- Experimental Loader Was Initialized --->
* Generic/LoaderType/experimental/Detected
<!--- Lite Agent Loader Was Initialized --->
* Generic/LoaderType/lite/Detected
<!--- Pro Agent Loader Was Initialized --->
* Generic/LoaderType/pro/Detected
<!--- Spa Agent Loader Was Initialized --->
* Generic/LoaderType/spa/Detected
<!--- Lite (Polyfilled) Agent Loader Was Initialized --->
* Generic/LoaderType/lite-polyfills/Detected
<!--- Pro (Polyfilled) Agent Loader Was Initialized --->
* Generic/LoaderType/pro-polyfills/Detected
<!--- Spa (Polyfilled) Agent Loader Was Initialized --->
* Generic/LoaderType/spa-polyfills/Detected
<!--- MicroAgent Loader Was Initialized --->
* Generic/LoaderType/micro-agent/Detected
<!--- CDN Distribution Method was Ininitialized --->
* Generic/DistMethod/CDN/Detected
<!--- NPM Distribution Method was Ininitialized --->
* Generic/DistMethod/NPM/Detected
<!--- Browser environment was Detected --->
* Generic/Runtime/Browser/Detected
<!--- Worker environment was Detected --->
* Generic/Runtime/Worker/Detected
<!--- Unknown environment was Detected --->
* Generic/Runtime/Unknown/Detected
<!--- Agent script element was decorated with nonce attribute --->
* Generic/Runtime/Nonce/Detected
* <!--- Agent running in an IFrame was Detected --->
* Generic/Runtime/IFrame/Detected
<!--- Agent is running in a local file --->
* Generic/FileProtocol/Detected
<!--- Obfuscation rules were Detected --->
* Generic/Obfuscate/Detected
<!--- Invalid obfuscation rules were Detected --->
* Generic/Obfuscate/Invalid
<!--- Current page was restored out of the BF Cache --->
* Generic/BFCache/PageRestored
<!--- A Performance.mark event was observed --->
* Generic/Performance/mark/Seen
<!--- A Performance.measure event was observed --->
* Generic/Performance/measure/Seen
<!--- A Performance.resource event was observed --->
* Generic/Performance/Resource/Seen
<!--- A first party Performance.resource event was observed --->
* Generic/Performance/FirstPartyResource/Seen
<!--- A first party Performance.resource event was observed --->
* Generic/Performance/NrResource/Seen
<!--- A resource timing API Ajax event was observed that matches the Agent beacon --->
* Generic/Resources/Ajax/Internal
<!--- A resource timing API Non-Ajax (other assets like scripts, etc) event was observed that matches the Agent beacon --->
* Generic/Resources/Non-Ajax/Internal
<!--- A resource timing API Ajax event was observed that does NOT match the Agent beacon --->
* Generic/Resources/Ajax/External
<!--- A resource timing API Non-Ajax (other assets like scripts, etc) event was observed that does NOT match the Agent beacon --->
* Generic/Resources/Non-Ajax/External
<!--- A <video> element was added to the DOM, should have a total count as part of the metric --->
* Generic/VideoElement/Added
<!--- A <iframe> element was added to the DOM, should have a total count as part of the metric --->
* Generic/IFrame/Added
<!--- The browser being controlled by webDriver was detected --->
* Generic/WebDriver/Detected
<!--- A CSP violation was detected --->
* Generic/CSPViolation/Detected
<!-- Invalid timestamp seen in processing RUM response -->
* Generic/TimeKeeper/InvalidTimestamp/Seen

### Frameworks
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
<!--- jQuery was Detected --->
* Framework/Jquery/Detected
<!--- MooTools was Detected --->
* Framework/MooTools/Detected
<!--- Qwik was Detected --->
* Framework/Qwik/Detected
<!--- Electron was Detected --->
* Framework/Electron/Detected
<!--- Flutter was Detected --->
* Framework/Flutter/Detected

### Configuration
<!--- init.privacy.cookies_Enabled was Disabled --->
* Config/SessionTracking/Disabled
<!--- init.long_task was Disabled --->
* Config/LongTask/Enabled
<!--- init.proxy.assets was Changed from the default --->
* Config/AssetsUrl/Changed
<!--- init.proxy.beacon was Changed from the default --->
* Config/BeaconUrl/Changed
<!--- init.performance.capture_marks was Enabled --->
* Config/Performance/CaptureMarks/Enabled
<!--- init.performance.capture_measures was Enabled --->
* Config/Performance/CaptureMeasures/Enabled
<!--- init.performance.resources was Enabled --->
* Config/Performance/Resources/Enabled
<!--- init.performance.resources.asset_types was changed --->
* Config/Performance/Resources/AssetTypes/Changed
<!--- init.performance.resources.first_party_domains was changed --->
* Config/Performance/Resources/FirstPartyDomains/Changed
<!--- init.performance.resources.ignore_newrelic was changed --->
* Config/Performance/Resources/IgnoreNewrelic/Changed
<!--- init.Session_replay.Enabled was Enabled --->
* Config/SessionReplay/Enabled
<!--- init.Session_replay.autoStart was Changed from the default --->
* Config/SessionReplay/AutoStart/Modified
<!--- init.Session_replay.collect_fonts was Changed from the default --->
* Config/SessionReplay/CollectFonts/Modified
<!--- init.Session_replay.inline_images was Changed from the default --->
* Config/SessionReplay/InlineImages/Modified
<!--- init.Session_replay.mask_all_inputs was Changed from the default --->
* Config/SessionReplay/MaskAllInputs/Modified
<!--- init.Session_replay.block_selector was Changed from the default --->
* Config/SessionReplay/BlockSelector/Modified
<!--- init.Session_replay.mask_text_selector was Changed from the default --->
* Config/SessionReplay/MaskTextSelector/Modified
<!--- init.Session_replay.sampling_rate --->
* Config/SessionReplay/SamplingRate/Value
<!--- init.Session_replay.error_sampling_rate  --->
* Config/SessionReplay/ErrorSamplingRate/Value

### Features
<!--- SessionReplay was Enabled but the RUM response indicated it was not entitled to run --->
* SessionReplay/EnabledNotEntitled/Detected
<!--- SessionReplay attempted to harvest data --->
* SessionReplay/Harvest/Attempts
<!--- SessionReplay Aborted after a natural Session reset--->
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
<!--- SessionReplay Aborted for unspecified reason --->
* SessionReplay/Abort/undefined
<!--- SessionReplay Detected missing inline CSS contents and could not fix them --->
* SessionReplay/Payload/Missing-Inline-Css/Failed
<!--- SessionReplay Detected missing inline CSS contents but was able to fix them --->
* SessionReplay/Payload/Missing-Inline-Css/Fixed
<!--- SessionReplay Detected missing inline CSS contents but skipped fixing them due to configuration --->
* SessionReplay/Payload/Missing-Inline-Css/Skipped

### Soft Nav
<!--- Soft Nav initial page load Interaction Duration in Ms --->
* SoftNav/Interaction/InitialPageLoad/Duration/Ms
<!--- Soft Nav interaction was extended by long task --->
* SoftNav/Interaction/Extended
<!--- Soft nav Interaction was cancelled due to timing out --->
* SoftNav/Interaction/TimeOut
<!--- Soft nav route change Interaction Duration in Ms --->
* SoftNav/Interaction/RouteChange/Duration/Ms
<!--- Soft nav Custom Interaction Duration in Ms --->
* SoftNav/Interaction/Custom/Duration/Ms
<!--- Spa initial page load Interaction Duration in Ms --->
* Spa/Interaction/InitialPageLoad/Duration/Ms
<!--- Spa route change Interaction Duration in Ms --->
* Spa/Interaction/RouteChange/Duration/Ms
<!--- Spa Custom Interaction Duration in Ms --->
* Spa/Interaction/Custom/Duration/Ms

### API
<!--- newrelic.start() was called --->
* API/start/called
<!--- newrelic.start() was called with no arguments --->
* API/start/undefined/called
<!--- newrelic.start() was called with arguments --->
* API/start/defined/called
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
* API/routeName/called
<!--- newrelic.setPageViewName() was called --->
* API/setPageViewName/called
<!--- newrelic.setCustomAttribute() was called --->
* API/setCustomAttribute/called
<!--- newrelic.Interaction() was called --->
* API/Interaction/called
<!--- newrelic.noticeError() was called --->
* API/noticeError/called
<!--- newrelic.setUserId() was called --->
* API/setUserId/called
<!--- newrelic.setApplicationVersion() was called --->
* API/setApplicationVersion/called
<!--- newrelic.Interaction.actionText() was called --->
* API/actionText/called
<!--- newrelic.Interaction.setName() was called --->
* API/setName/called
<!--- newrelic.Interaction.setAttribute() was called --->
* API/setAttribute/called
<!--- newrelic.Interaction.save() was called --->
* API/save/called
<!--- newrelic.Interaction.ignore() was called --->
* API/ignore/called
<!--- newrelic.Interaction.onEnd() was called --->
* API/onEnd/called
<!--- newrelic.Interaction.getContext() was called --->
* API/getContext/called
<!--- newrelic.Interaction.end() was called --->
* API/end/called
<!--- newrelic.Interaction.get() was called --->
* API/get/called
<!--- newrelic.inlineHit was called --->
* API/inlineHit/called
<!--- Logging level error was observed --->
* API/logging/error/called
<!--- Logging level trace was observed --->
* API/logging/trace/called
<!--- Logging level info was observed --->
* API/logging/info/called
<!--- Logging level debug was observed --->
* API/logging/debug/called
<!--- Logging level warn was observed --->
* API/logging/warn/called
<!--- newrelic.log() was called --->
* API/log/called
<!--- newrelic.wrapLogger() was called --->
* API/wrapLogger/called
<!--- newrelic.measure() was called --->
* API/measure/called
<!--- newrelic.consent() was called --->
* API/consent/called
<!--- newrelic.register() was called --->
* API/register/called
<!--- newrelic.register.addPageAction() was called --->
* API/register/addPageAction/called
<!--- newrelic.register.deregister() was called --->
* API/register/deregister/called
<!--- newrelic.register.log() was called --->
* API/register/log/called
<!--- newrelic.register.measure() was called --->
* API/register/measure/called
<!--- newrelic.register.noticeError() was called --->
* API/register/noticeError/called
<!--- newrelic.register.register() was called --->
* API/register/register/called
<!--- newrelic.register.recordCustomEvent() was called --->
* API/register/recordCustomEvent/called
<!--- newrelic.register.setApplicationVersion() was called --->
* API/register/setApplicationVersion/called
<!--- newrelic.register.setCustomAttribute() was called --->
* API/register/setCustomAttribute/called
<!--- newrelic.register.setUserId() was called --->
* API/register/setUserId/called

### INTERNAL ERRORS
<!--- an generalized internal error relating to rrweb processing was observed, typically thrown by rrweb's error handler -->
* Internal/Error/Rrweb
<!--- an internal error relating to rrweb processing tied to the security policy (or disabled browser APIs that are out of our control) was observed -->
* Internal/Error/Rrweb-Security-Policy
<!--- an uncategorized internal error was observed -->
* Internal/Error/Other
<!--- an uncategorized internal error was observed -->
* Internal/Error/GenericEvents-Resource

### Event Buffer
<!-- The number of bytes dropped across all features because an event buffer reached its cap -->
EventBuffer/Combined/Dropped/Bytes
<!-- The number of bytes dropped for ajax feature because an event buffer reached its cap -->
EventBuffer/ajax/Dropped/Bytes
<!-- The number of bytes dropped for generic events feature because an event buffer reached its cap -->
EventBuffer/generic_events/Dropped/Bytes
<!-- The number of bytes dropped for logging feature because an event buffer reached its cap -->
EventBuffer/logging/Dropped/Bytes
<!-- The number of bytes dropped for PVE feature because an event buffer reached its cap -->
EventBuffer/page_view_event/Dropped/Bytes
<!-- The number of bytes dropped for PVT feature because an event buffer reached its cap -->
EventBuffer/page_view_timing/Dropped/Bytes
<!-- The number of bytes dropped for spa feature because an event buffer reached its cap -->
EventBuffer/spa/Dropped/Bytes
<!-- The number of bytes dropped for soft_nav feature because an event buffer reached its cap -->
EventBuffer/soft_navigations/Dropped/Bytes

### Harvest
<!--- Ajax harvest was sent before the interval elapsed (bytes captured) --->
* ajax/Harvest/Early/Seen
<!--- Generic events harvest was sent before the interval elapsed (bytes captured) --->
* generic_events/Harvest/Early/Seen
<!--- Logging harvest was sent before the interval elapsed (bytes captured) --->
* logging/Harvest/Early/Seen
<!--- Page view timing harvest was sent before the interval elapsed (bytes captured) --->
* page_view_timing/Harvest/Early/Seen
<!--- Soft nav harvest was sent before the interval elapsed (bytes captured) --->
* soft_navigations/Harvest/Early/Seen
<!--- Logging harvest was sent before the interval elapsed (bytes captured) --->
* spa/Harvest/Early/Seen

### Audit
<!--- Page view event had hasReplay true but no session replay harvest (false positive) --->
* audit/page_view/hasReplay/false/positive
<!--- Page view event had hasReplay false but a session replay harvest occurred (false negative) --->
* audit/page_view/hasReplay/false/negative
<!--- Page view event had hasReplay true and a session replay harvest occurred (true positive) --->
* audit/page_view/hasReplay/true/positive
<!--- Page view event had hasReplay false and no session replay harvest occurred (true negative) --->
* audit/page_view/hasReplay/true/negative

<!--- Page view event had hasTrace true but no session trace harvest (false positive) --->
* audit/page_view/hasTrace/false/positive
<!--- Page view event had hasTrace false but a session trace harvest occurred (false negative) --->
* audit/page_view/hasTrace/false/negative
<!--- Page view event had hasTrace true and a session trace harvest occurred (true positive) --->
* audit/page_view/hasTrace/true/positive
<!--- Page view event had hasTrace false and no session trace harvest occurred (true negative) --->
* audit/page_view/hasTrace/true/negative

<!--- Session replay had hasError true but no js error harvest occurred (false positive) --->
* audit/session_replay/hasError/false/positive
<!--- Session replay had hasError false but a js error harvest occurred (false negative) --->
* audit/session_replay/hasError/false/negative
<!--- Session replay had hasError true and a js error harvest occurred (true positive) --->
* audit/session_replay/hasError/true/positive
<!--- Session replay had hasError false and no js error harvest occurred (true negative) --->
* audit/session_replay/hasError/true/negative

### Session Replay
<!-- node type 1 = Preload -->
* rrweb/node/1/bytes
<!-- node type 2 = Full snapshot -->
* rrweb/node/2/bytes
<!-- node type 3 = Incremental snapshot -->
* rrweb/node/3/bytes
<!-- node type 4 = Meta -->
* rrweb/node/4/bytes

### Harvester
<!-- Harvester retried a harvest -->
* 'Harvester/Retry/Attempted/<feature_name>'
<!-- Retry failed codes (dynamic) -->
* 'Harvester/Retry/Failed/<code>'
<!-- Retry succeeded codes (dynamic) -->
* 'Harvester/Retry/Succeeded/<code>'
  
### Browser Connect Response Metrics
<!--- HTTP status code of failed browser connect response --->
* 'Browser/Supportability/BCS/Error/<code>'
<!--- Total dropped payload size of failed browser connect response --->
* Browser/Supportability/BCS/Error/Dropped/Bytes
<!--- Response time of failed browser connect response --->
* Browser/Supportability/BCS/Error/Duration/Ms
