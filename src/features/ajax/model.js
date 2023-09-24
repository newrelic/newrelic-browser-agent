
export const model = () => ({
  ajax: { deny_list: undefined, block_internal: true, enabled: true, harvestTimeSeconds: 10, autoStart: true },
  distributed_tracing: {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  }
})
