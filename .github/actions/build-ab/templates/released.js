// config
window.NREUM={
  init: {
    distributed_tracing: {
      enabled: true
    },
    ajax: {
      deny_list: [
        'nr-data.net',
        'bam.nr-data.net',
        'staging-bam.nr-data.net',
        'bam-cell.nr-data.net'
      ]
    },
    session_replay: {
      enabled: true,
      autoStart: false,
      fix_stylesheets: false,
      {{#if (isEnvironment args.environment 'dev' 'staging')}}
      mask_all_inputs: false,
      mask_text_selector: null,
      {{/if}}
    },
    session_trace: {
      enabled: true
    },
    performance: {
      capture_marks: false, 
      capture_measures: true,
      resources: { 
        enabled: true,
        ignore_newrelic: false,
        first_party_domains: ['dev-one.nr-assets.net', 'staging-one.nr-assets.net', 'one.nr-assets.net', 'nr-assets.net']
      }
    },
    proxy: {}
  },
  loader_config: {
    accountID: '1',
    trustKey: '1',
    agentID: '{{{args.appId}}}',
    licenseKey: '{{{args.licenseKey}}}',
    applicationID: '{{{args.appId}}}'
  },
  info: {
    beacon: 'staging-bam.nr-data.net',
    errorBeacon: 'staging-bam.nr-data.net',
    licenseKey: '{{{args.licenseKey}}}',
    applicationID: '{{{args.appId}}}',
    sa: 1
  }
}

{{{releasedScript}}}
