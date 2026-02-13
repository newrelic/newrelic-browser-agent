/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 */

/**
 * @typedef {Object} Init
 * @property {Object} [ajax]
 * @property {Array<string>} [ajax.deny_list] - List of domain URLs to be excluded from AjaxRequest collection.
 * @property {boolean} [ajax.block_internal] - If true, agent requests going to harvest endpoint are treated as on deny list. In other words, agent will not self-report AJAX.
 * @property {boolean} [ajax.enabled] - Turn on/off the ajax feature (on by default).
 * @property {boolean} [ajax.autoStart] - If true, the agent will automatically start the ajax feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [api]
 * @property {boolean} [api.allow_registered_children] - If true, the agent will allow registered children to be sent to the server.
 * @property {boolean} [api.duplicate_registered_data] - If true, the agent will capture registered child data to the main agent as well as the registered child.
 * @property {Object} [distributed_tracing]
 * @property {boolean} [distributed_tracing.enabled] - If true, distributed tracing headers will be added to outgoing requests. Requires ajax feature to be running.
 * @property {boolean} [distributed_tracing.exclude_newrelic_header]
 * @property {boolean} [distributed_tracing.cors_use_newrelic_header]
 * @property {boolean} [distributed_tracing.cors_use_tracecontext_headers]
 * @property {Array<string>} [distributed_tracing.allowed_origins]
 * @property {Array<string>} [feature_flags] - An array of feature flags to enable experimental features.
 * @property {Object} [generic_events]
 * @property {boolean} [generic_events.enabled] - Turn on/off the generic events feature (on by default). This is required for `PageAction`, `UserAction`, and `BrowserPerformance` events.
 * @property {boolean} [generic_events.autoStart] - If true, the agent will automatically start the generic events feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [harvest]
 * @property {number} [harvest.interval] - The interval in seconds at which the agent will send out data. It's not recommended to change this value.
 * @property {Object} [jserrors]
 * @property {boolean} [jserrors.enabled] - Turn on/off the jserrors feature (on by default).
 * @property {boolean} [jserrors.autoStart] - If true, the agent will automatically start the jserrors feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [logging]
 * @property {boolean} [logging.enabled] - Turn on/off the logging feature (on by default).
 * @property {boolean} [logging.autoStart] - If true, the agent will automatically start the logging feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [metrics]
 * @property {boolean} [metrics.enabled] - Turn on/off the metrics feature (on by default).
 * @property {boolean} [metrics.autoStart] - If true, the agent will automatically start the metrics feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {{regex: RegExp | string, replacement: string}[]} [obfuscate] - Array of regexp and corresponding replacement patterns for obfuscating data.
 * @property {Object} [page_action]
 * @property {boolean} [page_action.enabled] - Must be true to allow PageAction events to be captured.
 * @property {Object} [page_view_event]
 * @property {boolean} [page_view_event.enabled] - This setting is ignored! PageViewEvent is always enabled by force.
 * @property {boolean} [page_view_event.autoStart] - If true, the agent will automatically send the RUM request. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [page_view_timing]
 * @property {boolean} [page_view_timing.enabled] - Turn on/off the page view timing feature (on by default).
 * @property {boolean} [page_view_timing.autoStart] - If true, the agent will automatically start the page view timing feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [performance]
 * @property {boolean} [performance.capture_marks] - If true, the agent will capture PerformanceMark events.
 * @property {boolean} [performance.capture_measures] - If true, the agent will capture PerformanceMeasure events.
 * @property {boolean} [performance.capture_detail] - If true, `BrowserPerformance` events from marks and measures will include, as attribute(s), the `detail` metadata provided to `markOptions` and `measureOptions`.
 * @property {Object} [performance.resources]
 * @property {boolean} [performance.resources.enabled] - If true, the agent will capture PerformanceResourceTiming entries.
 * @property {Array<string>} [performance.resources.asset_types] - Array of `initiatorType` strings to filter the desired ResourceTiming entries. By default, all resource types are captured.
 * @property {Array<string>} [performance.resources.first_party_domains] - Each resource URL will be checked against this list to determine if it should be labeled "first party" in the resulting `BrowserPerformance` event.
 * @property {boolean} [performance.resources.ignore_newrelic] - When true (default), resource entries associated with New Relic domains will be ignored.
 * @property {Object} [privacy]
 * @property {boolean} [privacy.cookies_enabled] - If true (default), session tracking of users across page loads is enabled in the agent. This is required for session trace, replay, and session-related features.
 * @property {Object} [proxy]
 * @property {string} [proxy.assets] - Set value will be used to overwrite the webpack asset path used to fetch agent assets.
 * @property {string} [proxy.beacon] - Set value will be used to overwrite the endpoint URL to which we send analytics.
 * @property {Object} [session]
 * @property {number} [session.expiresMs] - When session tracking is on, this determines how long a session will last before expiring. Modifying this value is not recommended.
 * @property {number} [session.inactiveMs] - When session tracking is on, this determines how long a session will last without user activity before expiring. Modifying this value is not recommended.
 * @property {Object} [session_replay]
 * @property {boolean} [session_replay.autoStart] - If true, the agent will automatically start the session replay feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {boolean} [session_replay.enabled] - Turn on/off the session replay feature (off by default).
 * @property {boolean} [session_replay.preload] - If true, allow the agent to run rrweb recorder immediately instead of waiting until after the window.load event, for new sessions. Existing sessions ignore this setting.
 * @property {number} [session_replay.sampling_rate] - This setting is deprecated and ineffective. Sampling is controlled in New Relic by server-side configuration.
 * @property {number} [session_replay.error_sampling_rate] - This setting is deprecated and ineffective.
 * @property {boolean} [session_replay.collect_fonts] - When true, serialize fonts for collection without public asset url. This is currently broken -- https://github.com/rrweb-io/rrweb/issues/1304.
 * @property {boolean} [session_replay.inline_images] - When true, serialize images for collection without public asset url. Not recommended for use. This is currently for TESTING as it easily generates payloads too large to be harvested.
 * @property {boolean} [session_replay.fix_stylesheets] - When true, tries to fetch any missing stylesheets again to inline in replayer.
 * @property {boolean} [session_replay.mask_all_inputs] - If true, all input content will be masked with asterisks.
 * @property {string} [session_replay.mask_text_selector] - Set value should be in CSS selector syntax and is used to identify matching elements to mask.
 * @property {string} [session_replay.block_selector] - Set value should be in CSS selector syntax and is used to identify matching elements to block.
 * @property {Object} [session_replay.mask_input_options] - If mask_all_inputs is not true, this object will be used to select what input to mask. Passwords are forcibly always masked.
 * @property {Object} [session_trace]
 * @property {boolean} [session_trace.enabled] - Turn on/off the session trace feature (on by default).
 * @property {boolean} [session_trace.autoStart] - If true, the agent will automatically start the session trace feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {Object} [soft_navigations]
 * @property {boolean} [soft_navigations.enabled] - Turn on/off the soft navigations feature (on by default).
 * @property {boolean} [soft_navigations.autoStart] - If true, the agent will automatically start the soft navigations feature. Otherwise, it will be in a deferred state until the `start` API method is called.
 * @property {boolean} [ssl] - If explicitly false, the agent will use HTTP instead of HTTPS. This setting should NOT be used.
 * @property {Object} [browser_consent_mode]
 * @property {boolean} [browser_consent_mode.enabled] - If true, the agent will use consent mode for whether to allow or disallow data harvest.
 * @property {Object} [user_actions]
 * @property {boolean} [user_actions.enabled] - Must be true to allow UserAction events to be captured.
 * @property {Array<string>} [user_actions.elementAttributes] - List of HTML Element properties to be captured with UserAction events' target elements. This may help to identify the source element being interacted with in the UI.
 */

export default {}
