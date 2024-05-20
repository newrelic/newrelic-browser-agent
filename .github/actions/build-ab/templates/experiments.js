window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.init.proxy = {} // Proxy won't work for experiments
window.NREUM.init.session_replay.enabled = true // enabled for ST migration experiment.  Follow up by disabling when the experiement is closed
window.NREUM.init.session_trace.enabled = true // enabled for ST migration experiment.  Follow up by disabling when the experiement is closed
window.NREUM.init.feature_flags = ['ajax_metrics_deny_list','soft_nav']

{{#if experimentScripts}}
{{#each experimentScripts}}
{{{this}}}
{{/each}}
{{else}}
console.log('NRBA: No experimental loaders found for this environment.')
{{/if}}
