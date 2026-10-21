/**
 * Metrics that do not pass their generated test yet. Each is reported as an expected failure (or a todo, if it has no trigger) and the
 * coverage test prints a warning with the count, but it does not fail. Entries are tags as written in the registry (expanded, for families).
 *
 * Rules the coverage test enforces so this list stays honest:
 * - a metric with no trigger that is not listed here fails, so a new metric cannot silently go untested;
 * - a metric listed here whose trigger now passes fails, so delete the line.
 *
 * Delete lines as triggers are written. The goal is an empty list. How to write a trigger: ./README.md
 */
module.exports = [
  'API/register/deregister/called',
  'API/register/register/called',
  'API/register/setApplicationVersion/called',
  'API/register/setCustomAttribute/called',
  'API/register/setUserId/called',
  'SessionReplay/Abort/Too-Many'
]
