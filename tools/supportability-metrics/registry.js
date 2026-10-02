/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The single source of truth for every supportability metric (SM) the agent can emit.
 *
 * - `docs/supportability-metrics.md` is GENERATED from this file (`npm run supportability-metrics:generate-docs`).
 * - `npm run supportability-metrics:check` statically scans `src/` and fails when:
 *     1. a metric is emitted that no entry here covers (you added an SM and forgot to register it), or
 *     2. an entry here is never emitted (a dead metric that should be deleted), unless it is marked `indirect`.
 *
 * To add a metric, add an entry below, then run `npm run supportability-metrics:generate-docs`.
 *
 * The shape of an entry, with a description of every property, is in registry-types.js. Your editor shows those descriptions as you type.
 * The one rule worth remembering: `values` lists the known values of an entry's placeholder, and `indirect` explains why the scan cannot
 * see an emitter.
 *
 * If a call to an SM reporting function passes a name the scan cannot work out (a variable or an imported constant), the check fails
 * unless the call is a forwarder marked with an `sm-registry: forwards <where>` block comment on the line above it (see aggregate-base.js).
 */

/** @type {import('./registry-types').Registry} */
const registry = {
  header: `# Supportability Metrics
---
## What/Why
Supportability metrics are intended to be used to give internal value through analysis of patterns, typically by occurrence or by value.

## How
A timeslice metric is harvested to the JSE/XHR consumer. An aggregation service called Angler aggregates metrics against known labels once per hour and reports a new event with the aggregation findings to a dedicated account.

## Adding or changing a metric
This file is generated from \`tools/supportability-metrics/registry.js\`. Do not edit it by hand. Add the metric to the registry and run \`npm run supportability-metrics:generate-docs\`. The pre-commit hook and CI run \`npm run supportability-metrics:check\`, which fails if \`src/\` emits a metric the registry does not cover, or the registry lists a metric that is never emitted.

Tags below are shown without the \`Browser/Supportability/\` prefix.`,

  sections: [
    { id: 'websockets', title: 'WebSockets' },
    { id: 'user_actions', title: 'User Actions' },
    { id: 'session', title: 'Session' },
    { id: 'ajax', title: 'AJAX' },
    { id: 'generic', title: 'Generic' },
    { id: 'frameworks', title: 'Frameworks' },
    {
      id: 'config',
      title: 'Configuration'
    },
    { id: 'flags', title: 'Feature Flags' },
    { id: 'session_replay', title: 'Session Replay' },
    { id: 'api', title: 'API' },
    {
      id: 'internal_errors',
      title: 'Internal Errors'
    },
    { id: 'event_buffer', title: 'Event Buffer' },
    { id: 'harvest', title: 'Harvest' },
    { id: 'audit', title: 'Audit' },
    { id: 'harvester', title: 'Harvester' },
    { id: 'bcs', title: 'Browser Connect Response Metrics' }
  ],

  entries: [
    // WebSockets
    { section: 'websockets', tag: 'WebSocket/Completed/Seen', description: 'WebSocket completed event was received (count)' },
    { section: 'websockets', tag: 'WebSocket/Completed/Bytes', description: 'WebSocket completed event payload size in bytes', value: { unit: 'bytes' } },

    // User actions
    { section: 'user_actions', tag: 'UserAction/RageClick/Seen', description: 'A user action has been detected as a rage click' },
    { section: 'user_actions', tag: 'UserAction/DeadClick/Seen', description: 'A user action has been detected as a dead click' },
    { section: 'user_actions', tag: 'UserAction/ErrorClick/Seen', description: 'A user action has been detected as an error click' },

    // Session
    { section: 'session', tag: 'Session/RaceCondition/Seen', description: 'Another page was running at the same time and already updated the session state' },

    // AJAX
    { section: 'ajax', tag: 'Ajax/Events/Excluded/Agent', description: 'Ajax Events were Excluded because they matched the Agent beacon' },
    { section: 'ajax', tag: 'Ajax/Metrics/Excluded/Agent', description: 'Ajax metrics were Excluded because they matched the Agent beacon' },
    { section: 'ajax', tag: 'Ajax/Events/Excluded/App', description: 'Ajax Events were Excluded because they matched the Customer deny list' },
    { section: 'ajax', tag: 'Ajax/Metrics/Excluded/App', description: 'Ajax metrics were Excluded because they matched the Customer deny list' },
    { section: 'ajax', tag: 'Ajax/Events/Payload/Bytes-Added', description: 'Number of bytes added to reported Ajax events by including request/response body, header, and query payload attributes', value: { unit: 'bytes' } },

    // Generic
    {
      section: 'generic',
      tag: 'Generic/LoaderType/<type>/Detected',
      description: 'The agent was initialized with this loader type',
      values: [
        ['agent', 'Generic Agent Loader Was Initialized (NPM)'],
        ['browser-agent', 'Browser Agent Loader Was Initialized (NPM)'],
        ['micro-agent', 'MicroAgent Loader Was Initialized'],
        ['experimental', 'Experimental Loader Was Initialized'],
        ['lite', 'Lite Agent Loader Was Initialized'],
        ['pro', 'Pro Agent Loader Was Initialized'],
        ['spa', 'Spa Agent Loader Was Initialized']
      ]
    },
    {
      section: 'generic',
      tag: 'Generic/DistMethod/<method>/Detected',
      description: 'The agent was distributed this way',
      values: [['CDN', 'CDN Distribution Method was Initialized'], ['NPM', 'NPM Distribution Method was Initialized']]
    },
    { section: 'generic', tag: 'Generic/Runtime/Nonce/Detected', description: 'Agent script element was decorated with nonce attribute' },
    { section: 'generic', tag: 'Generic/Runtime/IFrame/Detected', description: 'Agent running in an IFrame was Detected' },
    { section: 'generic', tag: 'Generic/FileProtocol/Detected', description: 'Agent is running in a local file' },
    { section: 'generic', tag: 'Generic/Obfuscate/Detected', description: 'Obfuscation rules were Detected' },
    { section: 'generic', tag: 'Generic/BFCache/PageRestored', description: 'Current page was restored out of the BF Cache' },
    { section: 'generic', tag: 'Generic/Performance/Resource/Seen', description: 'A Performance.resource event was observed' },
    { section: 'generic', tag: 'Generic/Performance/FirstPartyResource/Seen', description: 'A first party Performance.resource event was observed' },
    { section: 'generic', tag: 'Generic/Performance/NrResource/Seen', description: 'A New Relic Performance.resource event was observed' },
    { section: 'generic', tag: 'Generic/WebDriver/Detected', description: 'The browser being controlled by webDriver was detected' },
    { section: 'generic', tag: 'Generic/TimeKeeper/InvalidTimestamp/Seen', description: 'Invalid timestamp seen in processing RUM response', value: { unit: 'ms' } },
    { section: 'generic', tag: 'Generic/TimeKeeper/ClockDrift/Detected', description: 'Performance.now and Date APIs have drifted (forward only by >1000ms). Drift value is reported alongside count. Only reported once per page load', value: { unit: 'ms' } },

    // Frameworks (names come from the FRAMEWORKS table in src/features/metrics/aggregate/framework-detection.js)
    {
      section: 'frameworks',
      tag: 'Framework/<name>/Detected',
      description: 'A supported framework was detected on the page',
      valueDescription: '<v> was Detected',
      values: ['React', 'NextJS', 'Vue', 'NuxtJS', 'Angular', 'AngularUniversal', 'Svelte', 'SvelteKit', 'Preact', 'PreactSSR', 'AngularJS', 'Backbone', 'Ember', 'Meteor', 'Zepto', 'Jquery', 'MooTools', 'Qwik', 'Flutter', 'Electron']
    },

    // Config and flags
    {
      section: 'config',
      tag: 'Config/<init path>/Enabled',
      description: 'A boolean init setting that is true. Path mirrors init, e.g. init.session_replay.collect_fonts -> Config/session_replay/collect_fonts/Enabled. Absence means disabled. Settings a feature flag can also turn on (e.g. api.register.enabled) read as Enabled for either route',
      indirect: 'built in src/features/metrics/aggregate/config-metrics.js and reported through a forEach'
    },
    {
      section: 'config',
      tag: 'Config/<init path>/Changed',
      description: 'A non-boolean init setting that differs from its default. The value is never sent',
      indirect: 'built in src/features/metrics/aggregate/config-metrics.js and reported through a forEach'
    },
    {
      section: 'flags',
      tag: 'Feature_Flag/<flag>/Seen',
      description: 'A feature flag was present in init.feature_flags. One metric per flag, named by the flag (e.g. Feature_Flag/rum_v2/Seen)'
    },

    // Session replay
    { section: 'session_replay', tag: 'SessionReplay/EnabledNotEntitled/Detected', description: 'SessionReplay was Enabled but the RUM response indicated it was not entitled to run' },
    { section: 'session_replay', tag: 'SessionReplay/Harvest/Attempts', description: 'SessionReplay attempted to harvest data' },
    {
      section: 'session_replay',
      tag: 'SessionReplay/Abort/<reason>',
      description: 'SessionReplay aborted. An abort reason with no tag is reported as `undefined`, which indicates a bug at the call site',
      value: { unit: 'bytes', for: ['Too-Big'] },
      values: [
        ['Reset', 'SessionReplay Aborted after a natural Session reset'],
        ['Import', 'SessionReplay Aborted because the recording modules could not be imported'],
        ['Too-Many', 'SessionReplay Aborted because the Agent is currently being rate limited'],
        ['Too-Big', 'SessionReplay Aborted because the request was too large to send through vortex'],
        ['Cross-Tab', 'SessionReplay Aborted because another open tab Aborted for any reason'],
        ['Entitlement', 'SessionReplay Aborted because the App was not entitled to record']
      ]
    },
    {
      section: 'session_replay',
      tag: 'SessionReplay/Payload/Missing-Inline-Css/<outcome>',
      description: 'SessionReplay detected missing inline CSS contents',
      value: { unit: 'count' },
      values: [
        ['Failed', 'SessionReplay Detected missing inline CSS contents and could not fix them'],
        ['Fixed', 'SessionReplay Detected missing inline CSS contents but was able to fix them'],
        ['Skipped', 'SessionReplay Detected missing inline CSS contents but skipped fixing them due to configuration']
      ]
    },
    {
      section: 'session_replay',
      tag: 'rrweb/node/<type>/bytes',
      description: 'Bytes of an rrweb event, by rrweb event type',
      value: { unit: 'bytes' },
      values: [['1', 'node type 1 = Preload'], ['2', 'node type 2 = Full snapshot'], ['3', 'node type 3 = Incremental snapshot'], ['4', 'node type 4 = Meta']]
    },

    // API
    {
      section: 'api',
      tag: 'API/<name>/called',
      description: 'A public API method was called. Any method set up with setupAPI is reported automatically, so a new API is captured without further code',
      valueDescription: 'newrelic.<v>() was called',
      values: [
        'start', 'recordReplay', 'pauseReplay', 'createTracer', 'setErrorHandler', 'finished', 'addToTrace', 'addRelease', 'addPageAction',
        'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute', 'interaction', 'noticeError', 'setUserId', 'setApplicationVersion',
        ['actionText', 'newrelic.interaction().actionText() was called'],
        ['setName', 'newrelic.interaction().setName() was called'],
        ['setAttribute', 'newrelic.interaction().setAttribute() was called'],
        ['save', 'newrelic.interaction().save() was called'],
        ['ignore', 'newrelic.interaction().ignore() was called'],
        ['onEnd', 'newrelic.interaction().onEnd() was called'],
        ['getContext', 'newrelic.interaction().getContext() was called'],
        ['end', 'newrelic.interaction().end() was called'],
        ['get', 'newrelic.interaction().get() was called'],
        'log', 'wrapLogger', 'measure', 'consent', 'recordCustomEvent', 'register'
      ]
    },
    { section: 'api', tag: 'API/setUserId/resetSession/called', description: 'newrelic.setUserId() was called with resetSession = true that successfully executed' },
    {
      section: 'api',
      tag: 'API/register/<method>/called',
      description: 'A method on the object returned by newrelic.register() was called',
      valueDescription: 'newrelic.register().<v>() was called',
      values: ['addPageAction', 'deregister', 'log', 'measure', 'noticeError', 'register', 'recordCustomEvent', 'setApplicationVersion', 'setCustomAttribute', 'setUserId']
    },

    // Internal errors
    {
      section: 'internal_errors',
      tag: 'Internal/Error/<reason>',
      description: 'An internal error was swallowed instead of being reported to the customer',
      values: [
        ['Rrweb', 'a generalized internal error relating to rrweb processing was observed, typically thrown by rrweb\'s error handler. Also assigned when an error\'s leading frame is in the recorder or rrweb'],
        ['Rrweb-Security-Policy', 'an internal error relating to rrweb processing tied to the security policy (or disabled browser APIs that are out of our control) was observed'],
        ['SessionReplay-Import', 'the session replay recorder module failed to import'],
        ['SessionReplay-Record', 'the session replay recorder failed to start recording'],
        ['Session-Setup', 'the session manager failed to set up'],
        ['RumFlags', 'waiting on the RUM response flags failed in a feature aggregate'],
        ['Stringify', 'JSON.stringify failed in the agent\'s stringify utility'],
        ['Wrap-XHR', 'an error occurred wrapping XMLHttpRequest'],
        ['Wrap-Function', 'an error occurred emitting events from a wrapped function'],
        ['Ajax-Instrument', 'an error occurred in the ajax instrumentation (fetch, XHR response handling)'],
        ['GenericEvents-Resource', 'an error occurred processing a Performance resource timing entry'],
        ['Other', 'an internal error was observed without a reason']
      ]
    },

    // Event buffer
    {
      section: 'event_buffer',
      tag: 'EventBuffer/<feature>/Dropped/Bytes',
      description: 'The number of bytes dropped because an event buffer reached its cap',
      value: { unit: 'bytes' },
      valueDescription: 'The number of bytes dropped for <v> because an event buffer reached its cap',
      values: [['Combined', 'The number of bytes dropped across all features because an event buffer reached its cap'], 'ajax', 'generic_events', 'logging', 'page_view_event', 'page_view_timing', 'spa', 'soft_navigations']
    },

    // Harvest
    {
      section: 'harvest',
      tag: '<feature>/Harvest/Early/Seen',
      description: 'A feature harvest was sent before the interval elapsed (bytes captured)',
      value: { unit: 'bytes' },
      valueDescription: '<v> harvest was sent before the interval elapsed (bytes captured)',
      values: ['ajax', 'generic_events', 'logging', 'page_view_timing', 'soft_navigations', 'spa']
    },

    // Audit
    {
      section: 'audit',
      tag: 'audit/<feature>/<flag>/<flag value>/<result>',
      description: 'Cross-event audit of a harvest flag against whether that harvest actually occurred. <result> is positive or negative; <flag value> is true when the flag matched reality. Currently: page_view/hasReplay, page_view/hasTrace and session_replay/hasError, each with false/positive (flag set, no harvest), false/negative (flag unset, harvest occurred), true/positive and true/negative',
      indirect: 'built by formTag() in src/features/metrics/aggregate/harvest-metadata.js and reported through a forEach'
    },

    // Harvester
    {
      section: 'harvester',
      tag: 'Harvester/Retry/Attempted/<feature>',
      description: 'Harvester retried a harvest',
      indirect: 'reported through a local report() wrapper in src/common/harvest/harvester.js'
    },
    {
      section: 'harvester',
      tag: 'Harvester/Retry/Failed/<code>',
      description: 'Retry failed codes (dynamic)',
      indirect: 'reported through a local report() wrapper in src/common/harvest/harvester.js'
    },
    {
      section: 'harvester',
      tag: 'Harvester/Retry/Succeeded/<code>',
      description: 'Retry succeeded codes (dynamic)',
      indirect: 'reported through a local report() wrapper in src/common/harvest/harvester.js'
    },

    // Browser connect response
    {
      section: 'bcs',
      tag: 'BCS/Error/<code>',
      description: 'HTTP status code of failed browser connect response',
      indirect: 'sent as a raw { params, stats } object in connector.js and page_view_event/aggregate'
    },
    {
      section: 'bcs',
      tag: 'BCS/Error/Dropped/Bytes',
      description: 'Total dropped payload size of failed browser connect response',
      value: { unit: 'bytes' },
      indirect: 'sent as a raw { params, stats } object in connector.js and page_view_event/aggregate'
    },
    {
      section: 'bcs',
      tag: 'BCS/Error/Duration/Ms',
      description: 'Response time of failed browser connect response',
      value: { unit: 'ms' },
      indirect: 'sent as a raw { params, stats } object in connector.js and page_view_event/aggregate'
    }

  ]
}

module.exports = registry
