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
      capture_marks: true, 
      capture_measures: true
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

window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.init.proxy = {} // Proxy won't work for experiments
window.NREUM.init.session_replay.enabled = false // disabled for now to not double wrap the page which can cause extra processing burden
window.NREUM.init.session_trace.enabled = false // disabled for now to not double wrap the page which can cause extra processing burden
window.NREUM.init.feature_flags = ['ajax_metrics_deny_list','soft_nav']

{{#if experimentScripts}}
{{#each experimentScripts}}
{{{this}}}
{{/each}}
{{else}}
console.log('NRBA: No experimental loaders found for this environment.')
{{/if}}
