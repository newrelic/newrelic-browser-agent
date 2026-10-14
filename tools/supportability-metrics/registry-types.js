/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * JSDoc types for tools/supportability-metrics/registry.js. They exist so that editors can describe each property as you fill in an entry.
 * Nothing in this file runs.
 */

/**
 * The id of a section of the generated docs page. Keep this list in sync with `Registry.sections` in registry.js: a unit test fails when
 * the two drift apart.
 * @typedef {'websockets' | 'user_actions' | 'session' | 'ajax' | 'generic' | 'frameworks' | 'config' | 'flags' | 'session_replay' | 'api' | 'internal_errors' | 'event_buffer' | 'harvest' | 'warnings' | 'audit' | 'harvester' | 'bcs'} RegistrySectionId
 */

/**
 * A known value of an entry's placeholder: either just the value, or a `[value, description]` pair when that value needs its own description.
 * @typedef {string | [value: string, description: string]} RegistryValue
 */

/**
 * The unit of the value a metric reports alongside its count. Angler stores a value as `total_call_time` (and `min_call_time` and
 * `max_call_time`), so the dashboard uses the unit to label the average, minimum and maximum charts.
 * @typedef {'ms' | 'bytes' | 'count'} RegistryValueUnit
 */

/**
 * Says that a metric reports a value with each call, not just that it happened, and what the value measures.
 * @typedef {Object} RegistryValueInfo
 * @property {RegistryValueUnit | 'TODO'} unit What the value measures. `TODO` is the placeholder that `--fix` writes for a new metric that passes a
 *   value, and makes the check fail until it is replaced.
 * @property {string[]} [for] For a family, the subset of its `values` that report a value. Without it, every value of the family does. For example
 *   only one abort reason reports a size.
 */

/**
 * One supportability metric, or one family of metrics that differ by a dynamic part of the name.
 *
 * Add one for every metric the agent reports. `npm run supportability-metrics:check -- --fix` creates a stub for you; you fill in the
 * description and check the section.
 * @typedef {Object} RegistryEntry
 * @property {RegistrySectionId} section Which section of docs/supportability-metrics.md the metric is listed under.
 * @property {string} tag The metric name without the `Browser/Supportability/` prefix, exactly as the agent reports it, e.g.
 *   `Session/RaceCondition/Seen`. A `<placeholder>` marks a dynamic part, e.g. `API/<name>/called`. The scanner compares this against the
 *   names found in `src/`, so a typo makes the check fail.
 * @property {string} description What the metric means and when it is reported. Shown in the generated docs. Required: a description that
 *   is still the `TODO` placeholder makes the check fail.
 * @property {RegistryValue[]} [values] The known values of the single placeholder in `tag`. Each is expanded in the docs so every full tag
 *   is visible, since Angler accepts only fully formed strings. A literal name the agent reports that falls under an entry with `values` must
 *   be one of them, or the check fails. Names only known at runtime (API names, loader types) are matched by shape and not verified, so keep
 *   those lists in sync by hand. Leave `values` out for an open-ended family such as `Feature_Flag/<flag>/Seen`.
 * @property {string} [valueDescription] A description template for values that have no description of their own, where `<v>` is replaced
 *   by the value, e.g. `newrelic.<v>() was called`. Without it, such values use the entry's `description`.
 * @property {RegistryValueInfo} [value] Present when the metric reports a value with each call (a duration, a size, a count). The check fails if a
 *   call passes a value and this is missing, or if this is set and no call passes one. Metrics without it only report that they happened.
 * @property {string} [indirect] Set only when the static scan cannot see where the metric is reported, for example because the name is
 *   built in a helper and reported in a loop. The text should say where. An entry marked this way is exempt from the "registered but never
 *   emitted" check, so use it sparingly.
 */

/**
 * A heading in the generated docs page that groups entries.
 * @typedef {Object} RegistrySection
 * @property {RegistrySectionId} id What an entry's `section` refers to. Also decides the order of the page, which follows the order of the
 *   `sections` array.
 * @property {string} title The heading shown on the docs page.
 * @property {string} [intro] Optional text shown under the heading, before the entries.
 */

/**
 * The registry: the single source of truth for every supportability metric the agent can report. docs/supportability-metrics.md is
 * generated from it (`npm run supportability-metrics:generate-docs`).
 * @typedef {Object} Registry
 * @property {string} header Markdown shown at the top of the generated docs page, above the first section.
 * @property {RegistrySection[]} sections The sections of the docs page, in the order they are shown. Sections with no entries are omitted.
 * @property {RegistryEntry[]} entries Every supportability metric. The order within a section is the order shown in the docs.
 */

module.exports = {}
