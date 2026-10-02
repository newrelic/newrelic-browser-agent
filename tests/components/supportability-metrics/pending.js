/**
 * Metrics that do not pass their generated test yet. Each is reported as an expected failure (or a todo, if it has no trigger) and the
 * coverage test prints a warning with the count, but it does not fail. Entries are tags as written in the registry (expanded, for families).
 *
 * Rules the coverage test enforces so this list stays honest:
 * - a metric with no trigger that is not listed here fails, so a new metric cannot silently go untested;
 * - a metric listed here whose trigger now passes fails, so delete the line.
 *
 * Delete lines as triggers are written. The goal is an empty list.
 */
module.exports = [
  // These are documented and in the registry, but src/loaders/api/register.js never reports them: only methods that go through its
  // report() helper (addPageAction, log, measure, noticeError, recordCustomEvent) emit an API/register/<method>/called metric. The local
  // setters and deregister() do not. Either report them in register.js, or remove these values from the registry.
  'API/register/deregister/called',
  'API/register/register/called',
  'API/register/setApplicationVersion/called',
  'API/register/setCustomAttribute/called',
  'API/register/setUserId/called',

  // ABORT_REASONS.TOO_MANY is defined in src/features/session_replay/constants.js but nothing passes it to abort(). A 429 is handled in
  // postHarvestCleanup with warn(70) and forceStop() instead. Either abort with this reason there, or remove the metric from the registry.
  'SessionReplay/Abort/Too-Many'
]
