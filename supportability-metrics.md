## Supportability Metrics Captured By The Browser Agent

### Where are they sent?
Supportability Metrics are sent as timeslice metrics to the JSE/XHR consumer. They are then intercepted, processed, and aggregated by [Angler](https://source.datanerd.us/agents/angler).

### Supportability Metrics
/** ----- SESSION ----- */
/** Session has ended due to max time limit reached */
// export const SESSION_EXPIRED_SEEN = SESSION+ '/Expired/' +SEEN
export const SESSION_EXPIRED_SEEN = SESSION + '/Expired/' + SEEN
/** Session has ended due to inactivity time limit reached */
export const SESSION_INACTIVE_SEEN = SESSION + '/Inactive/' + SEEN
/** Duration of session at time of ending */
export const SESSION_DURATION_MS = SESSION + '/' + DURATION + '/' + MS
/** Capture SMs for session trace if active (ptid is set when returned by replay ingest). Retain these SMs while we are working through the session_replay feature */
export const PAGE_SESSION_FEATURE_SESSION_TRACE_DURATION_MS = 'PageSession/' + FEATURE + '/' + SESSION + 'Trace/' + DURATION + MS

/** ----- AJAX ----- */
/** AJAX events were excluded because they matched the agent beacon */
export const AJAX_EVENTS_EXCLUDED_AGENT = AJAX + '/' + EVENTS + '/' + EXCLUDED + '/' + AGENT
/** AJAX metrics were excluded because they matched the agent beacon */
export const AJAX_METRICS_EXCLUDED_AGENT = AJAX + '/' + METRICS + '/' + EXCLUDED + '/' + AGENT
/** AJAX events were excluded because they matched the customer deny list */
export const AJAX_EVENTS_EXCLUDED_APP = AJAX + '/' + EVENTS + '/' + EXCLUDED + '/' + APP
/** AJAX metrics were excluded because they matched the customer deny list */
export const AJAX_METRICS_EXCLUDED_APP = AJAX + '/' + METRICS + '/' + EXCLUDED + '/' + APP
/** Number of bytes added to reported AJAX event bodies by adding GQL metadata */
export const AJAX_EVENTS_GQL_BYTES_ADDED = AJAX + '/' + EVENTS + '/GraphQL/Bytes-Added'
/** Observed AJAX calls contained a CrossApplicationTracing header */
export const AJAX_CAT_HEADER_SEEN = AJAX + '/CrossApplicationTracing/Header/' + SEEN

/** ----- GENERIC ----- */
/** Generic Agent Loader Was Initialized (NPM) */
export const GENERIC_LOADER_TYPE_AGENT_DETECTED = GENERIC + '/' + LOADER_TYPE + '/agent/' + DETECTED
/** Browser Agent Loader Was Initialized (NPM) */
export const GENERIC_LOADER_TYPE_BROWSER_AGENT_DETECTED = GENERIC + '/' + LOADER_TYPE + '/browser-agent/' + DETECTED
/** Experimental Loader Was Initialized */
export const GENERIC_LOADER_TYPE_EXPERIMENTAL_DETECTED = GENERIC + '/' + LOADER_TYPE + '/experimental/' + DETECTED
/** Lite Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_LITE_DETECTED = GENERIC + '/' + LOADER_TYPE + '/lite/' + DETECTED
/** Pro Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_PRO_DETECTED = GENERIC + '/' + LOADER_TYPE + '/pro/' + DETECTED
/** SPA Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_SPA_DETECTED = GENERIC + '/' + LOADER_TYPE + '/spa/' + DETECTED
/** Lite (Polyfilled) Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_LITE_POLYFILLS_DETECTED = GENERIC + '/' + LOADER_TYPE + '/lite-polyfills/' + DETECTED
/** Pro (Polyfilled) Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_PRO_POLYFILLS_DETECTED = GENERIC + '/' + LOADER_TYPE + '/pro-polyfills/' + DETECTED
/** SPA (Polyfilled) Agent Loader Was Initialized */
export const GENERIC_LOADER_TYPE_SPA_POLYFILLS_DETECTED = GENERIC + '/' + LOADER_TYPE + '/spa-polyfills/' + DETECTED
/** CDN Distribution Method was Ininitialized */
export const GENERIC_DIST_METHOD_CDN_DETECTED = GENERIC + '/' + DIST_METHOD + '/CDN/' + DETECTED
/** NPM Distribution Method was Ininitialized */
export const GENERIC_DIST_METHOD_NPM_DETECTED = GENERIC + '/' + DIST_METHOD + '/NPM/' + DETECTED
/** Browser environment was detected */
export const GENERIC_RUNTIME_BROWSER_DETECTED = GENERIC + '/' + RUNTIME + '/Browser/' + DETECTED
/** Worker environment was detected */
export const GENERIC_RUNTIME_WORKER_DETECTED = GENERIC + '/' + RUNTIME + '/Worker/' + DETECTED
/** Unknown environment was detected */
export const GENERIC_RUNTIME_UNKNOWN_DETECTED = GENERIC + '/' + RUNTIME + '/Unknown/' + DETECTED
/** Agent script element was decorated with nonce attribute */
export const GENERIC_RUNTIME_NONCE_DETECTED = GENERIC + '/' + RUNTIME + '/Nonce/' + DETECTED
/** Agent is running in a local file */
export const GENERIC_FILE_PROTOCOL_DETECTED = GENERIC + '/FileProtocol/' + DETECTED
/** Obfuscation rules were detected */
export const GENERIC_OBFUSCATE_DETECTED = GENERIC + '/Obfuscate/' + DETECTED
/** Invalid obfuscation rules were detected */
export const GENERIC_OBFUSCATE_INVALID = GENERIC + '/Obfuscate/Invalid'
/** Current page was restored out of the BF Cache */
export const GENERIC_BF_CACHE_PAGE_RESTORED = GENERIC + '/BFCache/PageRestored'
/** A performance.mark event was observed */
export const GENERIC_PERFORMANCE_MARK_SEEN = GENERIC + '/' + PERFORMANCE + '/Mark/' + SEEN
/** A performance.measure event was observed */
export const GENERIC_PERFORMANCE_MEASURE_SEEN = GENERIC + '/' + PERFORMANCE + '/Measure/' + SEEN
/** A resource timing API AJAX event was observed that matches the agent beacon */
export const GENERIC_RESOURCES_AJAX_INTERNAL = GENERIC + '/' + RESOURCES + '/' + AJAX + '/' + INTERNAL
/** A resource timing API Non-AJAX (other assets like scripts, etc) event was observed that matches the agent beacon */
export const GENERIC_RESOURCES_NON_AJAX_INTERNAL = GENERIC + '/' + RESOURCES + '/Non-' + AJAX + '/' + INTERNAL
/** A resource timing API AJAX event was observed that does NOT match the agent beacon */
export const GENERIC_RESOURCES_AJAX_EXTERNAL = GENERIC + '/' + RESOURCES + '/' + AJAX + '/' + EXTERNAL
/** A resource timing API Non-AJAX (other assets like scripts, etc) event was observed that does NOT match the agent beacon */
export const GENERIC_RESOURCES_NON_AJAX_EXTERNAL = GENERIC + '/' + RESOURCES + '/Non-' + AJAX + '/' + EXTERNAL

/** ----- FRAMEWORKS ----- */
/** React was detected */
export const FRAMEWORK_REACT_DETECTED = FRAMEWORK + '/React/' + DETECTED
/** NextJS was detected */
export const FRAMEWORK_NEXTJS_DETECTED = FRAMEWORK + '/NextJS/' + DETECTED
/** Vue was detected */
export const FRAMEWORK_VUE_DETECTED = FRAMEWORK + '/Vue/' + DETECTED
/** NuxtJS was detected */
export const FRAMEWORK_NUXTJS_DETECTED = FRAMEWORK + '/NuxtJS/' + DETECTED
/** Angular was detected */
export const FRAMEWORK_ANGULAR_DETECTED = FRAMEWORK + '/' + ANGULAR + '/' + DETECTED
/** AngularUniversal was detected */
export const FRAMEWORK_ANGULAR_UNIVERSAL_DETECTED = FRAMEWORK + '/' + ANGULAR + 'Universal/' + DETECTED
/** Svelte was detected */
export const FRAMEWORK_SVELTE_DETECTED = FRAMEWORK + '/Svelte/' + DETECTED
/** SvelteKit was detected */
export const FRAMEWORK_SVELTEKIT_DETECTED = FRAMEWORK + '/SvelteKit/' + DETECTED
/** Preact was detected */
export const FRAMEWORK_PREACT_DETECTED = FRAMEWORK + '/Preact/' + DETECTED
/** PreactSSR was detected */
export const FRAMEWORK_PREACTSSR_DETECTED = FRAMEWORK + '/PreactSSR/' + DETECTED
/** AngularJS was detected */
export const FRAMEWORK_ANGULARJS_DETECTED = FRAMEWORK + '/' + ANGULAR + 'JS/' + DETECTED
/** Backbone was detected */
export const FRAMEWORK_BACKBONE_DETECTED = FRAMEWORK + '/Backbone/' + DETECTED
/** Ember was detected */
export const FRAMEWORK_EMBER_DETECTED = FRAMEWORK + '/Ember/' + DETECTED
/** Meteor was detected */
export const FRAMEWORK_METEOR_DETECTED = FRAMEWORK + '/Meteor/' + DETECTED
/** Zepto was detected */
export const FRAMEWORK_ZEPTO_DETECTED = FRAMEWORK + '/Zepto/' + DETECTED
/** jQuery was detected */
export const FRAMEWORK_JQUERY_DETECTED = FRAMEWORK + '/Jquery/' + DETECTED
/** MooTools was detected */
export const FRAMEWORK_MOOTOOLS_DETECTED = FRAMEWORK + '/MooTools/' + DETECTED
/** Qwik was detected */
export const FRAMEWORK_QWIK_DETECTED = FRAMEWORK + '/Qwik/' + DETECTED
/** Electron was detected */
export const FRAMEWORK_ELECTRON_DETECTED = FRAMEWORK + '/Electron/' + DETECTED

/** ----- CONFIGURATION ----- */
/** init.privacy.cookies_enabled was disabled */
export const CONFIG_SESSION_TRACKING_DISABLED = CONFIG + '/' + SESSION + 'Tracking/' + DISABLED
/** init.long_task was disabled */
export const CONFIG_LONG_TASK_ENABLED = CONFIG + '/LongTask/' + ENABLED
/** init.proxy.assets was changed from the default */
export const CONFIG_ASSETS_URL_CHANGED = CONFIG + '/AssetsUrl/' + CHANGED
/** init.proxy.beacon was changed from the default */
export const CONFIG_BEACON_URL_CHANGED = CONFIG + '/BeaconUrl/' + CHANGED
/** init.session_replay.enabled was enabled */
export const CONFIG_SESSION_REPLAY_ENABLED = CONFIG + '/' + SESSION + REPLAY + '/' + ENABLED
/** init.session_replay.autoStart was changed from the default */
export const CONFIG_SESSION_REPLAY_AUTOSTART_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/AutoStart/' + MODIFIED
/** init.session_replay.collect_fonts was changed from the default */
export const CONFIG_SESSION_REPLAY_COLLECT_FONTS_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/CollectFonts/' + MODIFIED
/** init.session_replay.inline_stylesheet was changed from the default */
export const CONFIG_SESSION_REPLAY_INLINE_STYLESHEET_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/InlineStylesheet/' + MODIFIED
/** init.session_replay.inline_images was changed from the default */
export const CONFIG_SESSION_REPLAY_INLINE_IMAGES_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/InlineImages/' + MODIFIED
/** init.session_replay.mask_all_inputs was changed from the default */
export const CONFIG_SESSION_REPLAY_MASK_ALL_INPUTS_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/MaskAllInputs/' + MODIFIED
/** init.session_replay.block_selector was changed from the default */
export const CONFIG_SESSION_REPLAY_BLOCK_SELECTOR_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/BlockSelector/' + MODIFIED
/** init.session_replay.mask_text_selector was changed from the default */
export const CONFIG_SESSION_REPLAY_MASK_TEXT_SELECTOR_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/MaskTextSelector/' + MODIFIED
/** init.session_replay.sampling_rate was changed from the default */
export const CONFIG_SESSION_REPLAY_SAMPLING_RATE_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/SamplingRate/' + MODIFIED
/** init.session_replay.error_sampling_rate was changed from the default */
export const CONFIG_SESSION_REPLAY_ERROR_SAMPLING_RATE_MODIFIED = CONFIG + '/' + SESSION + REPLAY + '/' + ERROR + 'SamplingRate/' + MODIFIED

/** ----- FEATURES ----- */
/** The time manager failed to calculate a valid time from the Page View Event response */
export const PVE_NR_TIME_CALCULATION_FAILED = 'PVE/NRTime/Calculation/' + FAILED
/** Session replay was enabled but the RUM response indicated it was not entitled to run */
export const SESSION_REPLAY_ENABLED_NOT_ENTITLED_DETECTED = SESSION + REPLAY + '/' + ENABLED + 'NotEntitled/' + DETECTED
/** Session replay attempted to harvest data */
export const SESSION_REPLAY_HARVEST_ATTEMPTS = SESSION + REPLAY + '/Harvest/Attempts'
/** Session replay aborted after a natural session reset */
export const SESSION_REPLAY_ABORT_RESET = SESSION + REPLAY + '/' + ABORT + '/Reset'
/** Session replay aborted because the recording modules could not be imported */
export const SESSION_REPLAY_ABORT_IMPORT = SESSION + REPLAY + '/' + ABORT + '/Import'
/** Session replay aborted because the agent is currently being rate limited */
export const SESSION_REPLAY_ABORT_TOO_MANY = SESSION + REPLAY + '/' + ABORT + '/Too-Many'
/** Session replay aborted because the request was too large to send through vortex */
export const SESSION_REPLAY_ABORT_TOO_BIG = SESSION + REPLAY + '/' + ABORT + '/Too-Big'
/** Session replay aborted because another open tab aborted for any reason */
export const SESSION_REPLAY_ABORT_CROSS_TAB = SESSION + REPLAY + '/' + ABORT + '/Cross-Tab'
/** Session replay aborted because the app was not entitled to record */
export const SESSION_REPLAY_ABORT_ENTITLEMENT = SESSION + REPLAY + '/' + ABORT + '/Entitlement'
/** Session replay detected missing inline CSS contents and could not fix them */
export const SESSION_REPLAY_PAYLOAD_MISSING_INLINE_CSS_FAILED = SESSION + REPLAY + '/' + PAYLOAD_MISSING_INLINE_CSS + '/' + FAILED
/** Session replay detected missing inline CSS contents but was able to fix them */
export const SESSION_REPLAY_PAYLOAD_MISSING_INLINE_CSS_FIXED = SESSION + REPLAY + '/' + PAYLOAD_MISSING_INLINE_CSS + '/Fixed'
/** Soft Nav initial page load interaction duration in ms */
export const SOFT_NAV_INTERACTION_IPL_DURATION_MS = SOFT_NAV + '/' + INTERACTION + '/' + INITAL_PAGE_LOAD + '/' + DURATION + '/' + MS
/** Soft nav interaction was cancelled due to timing out */
export const SOFT_NAV_INTERACTION_TIME_OUT = SOFT_NAV + '/' + INTERACTION + '/TimeOut'
/** Soft nav route change interaction duration in ms */
export const SOFT_NAV_INTERACTION_ROUTE_CHANGE_DURATION_MS = SOFT_NAV + '/' + INTERACTION + '/' + ROUTE_CHANGE + '/' + DURATION + '/' + MS
/** Soft nav custom interaction duration in ms */
export const SOFT_NAV_INTERACTION_CUSTOM_DURATION_MS = SOFT_NAV + '/' + INTERACTION + '/' + CUSTOM + '/' + DURATION + '/' + MS
/** SPA initial page load interaction duration in ms */
export const SPA_INTERACTION_IPL_DURATION_MS = SPA + '/' + INTERACTION + '/' + INITAL_PAGE_LOAD + '/' + DURATION + '/' + MS
/** SPA route change interaction duration in ms */
export const SPA_INTERACTION_ROUTE_CHANGE_DURATION_MS = SPA + '/' + INTERACTION + '/' + ROUTE_CHANGE + '/' + DURATION + '/' + MS
/** SPA custom interaction duration in ms */
export const SPA_INTERACTION_CUSTOM_DURATION_MS = SPA + '/' + INTERACTION + '/' + CUSTOM + '/' + DURATION + '/' + MS

/** ----- API ----- */
/** newrelic.start() was called with no arguments */
export const API_START_UNDEFINED_CALLED = API + '/' + START + '/un' + DEFINED + '/' + CALLED
/** newrelic.start() was called with arguments */
export const API_START_DEFINED_CALLED = API + '/' + START + '/' + DEFINED + '/' + CALLED
/** newrelic.recordReplay() was called */
export const API_RECORD_REPLAY_CALLED = API + '/record' + REPLAY + '/' + CALLED
/** newrelic.pauseReplay() was called */
export const API_PAUSE_REPLAY_CALLED = API + '/pause' + REPLAY + '/' + CALLED
/** newrelic.createTracer() was called */
export const API_CREATE_TRACER_CALLED = API + '/createTracer/' + CALLED
/** newrelic.setErrorHandler() was called */
export const API_SET_ERROR_HANDLER_CALLED = API + '/' + SET + ERROR + 'Handler/' + CALLED
/** newrelic.finished() was called */
export const API_FINISHED_CALLED = API + '/finished/' + CALLED
/** newrelic.addToTrace() was called */
export const API_ADD_TO_TRACE_CALLED = API + '/addToTrace/' + CALLED
/** newrelic.addRelease() was called */
export const API_ADD_RELEASE_CALLED = API + '/addRelease/' + CALLED
/** newrelic.addPageAction() was called */
export const API_ADD_PAGE_ACTION_CALLED = API + '/addPageAction/' + CALLED
/** newrelic.setCurrentRouteName() was called */
export const API_ROUTE_NAME_CALLED = API + '/routeName/' + CALLED
/** newrelic.setPageViewName() was called */
export const API_SET_PAGE_VIEW_NAME_CALLED = API + '/' + SET + 'PageViewName/' + CALLED
/** newrelic.setCustomAttribute() was called */
export const API_SET_CUSTOM_ATTRIBUTE_CALLED = API + '/' + SET + 'CustomAttribute/' + CALLED
/** newrelic.interaction() was called */
export const API_INTERACTION_CALLED = API + '/interaction/' + CALLED
/** newrelic.noticeError() was called */
export const API_NOTICE_ERROR_CALLED = API + '/notice' + ERROR + '/' + CALLED
/** newrelic.setUserId() was called */
export const API_SET_USER_ID_CALLED = API + '/' + SET + 'UserId/' + CALLED
/** newrelic.setApplicationVersion() was called */
export const API_SET_APPLICATION_VERSION_CALLED = API + '/' + SET + 'ApplicationVersion/' + CALLED
/** newrelic.interaction.actionText() was called */
export const API_ACTION_TEXT_CALLED = API + '/actionText/' + CALLED
/** newrelic.interaction.setName() was called */
export const API_SET_NAME_CALLED = API + '/' + SET + 'Name/' + CALLED
/** newrelic.interaction.setAttribute() was called */
export const API_SET_ATTRIBUTE_CALLED = API + '/' + SET + 'Attribute/' + CALLED
/** newrelic.interaction.save() was called */
export const API_SAVE_CALLED = API + '/save/' + CALLED
/** newrelic.interaction.ignore() was called */
export const API_IGNORE_CALLED = API + '/ignore/' + CALLED
/** newrelic.interaction.onEnd() was called */
export const API_ON_END_CALLED = API + '/onEnd/' + CALLED
/** newrelic.interaction.getContext() was called */
export const API_GET_CONTEXT_CALLED = API + '/getContext/' + CALLED
/** newrelic.interaction.end() was called */
export const API_END_CALLED = API + '/end/' + CALLED
/** newrelic.interaction.get() was called */
export const API_GET_CALLED = API + '/get/' + CALLED