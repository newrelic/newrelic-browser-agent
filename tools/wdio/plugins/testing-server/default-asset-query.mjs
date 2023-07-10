/**
 * When using deepmerge-ts, this object acts as the default and schema
 * for what we pass back to the testing server. If a configuration option
 * is not defined in this object, it cannot be overridden in a test.
 */
const query = {
  loader: 'spa',
  init: {
    allow_bfcache: true,
    privacy: { cookies_enabled: false },
    ajax: { deny_list: [], block_internal: true, enabled: true, harvestTimeSeconds: 5 },
    distributed_tracing: {},
    session: { domain: undefined, expiresMs: 14400000, inactiveMs: 1800000 },
    ssl: false,
    obfuscate: undefined,
    jserrors: { enabled: true, harvestTimeSeconds: 5 },
    metrics: { enabled: true },
    page_action: { enabled: true, harvestTimeSeconds: 5 },
    page_view_event: { enabled: true },
    page_view_timing: { enabled: true, harvestTimeSeconds: 5, long_task: false },
    session_trace: { enabled: true, harvestTimeSeconds: 5 },
    spa: { enabled: true, harvestTimeSeconds: 5 },
    harvest: { tooManyRequestsDelay: 5 },
    session_replay: { enabled: false, harvestTimeSeconds: 5, sampleRate: 0, errorSampleRate: 0 }
  }
}

export default query
