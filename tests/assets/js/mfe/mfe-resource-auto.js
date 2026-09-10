// A script that calls register() itself (no manifest) -- loaded via a real <script src> tag rather than
// inline, so it produces its own PerformanceResourceTiming entry that resource-based attribution can match
// against `timings.asset`.
newrelic.register({
  id: 'resource-auto-mfe',
  name: 'ResourceAutoMFE'
})
