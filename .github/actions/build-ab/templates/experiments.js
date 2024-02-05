window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.init.proxy.assets = 'https://staging-js-agent.newrelic.com'
window.NREUM.init.session_replay.enabled = false
window.NREUM.init.session_trace.enabled = false
window.NREUM.init.feature_flags = ['soft_nav']

{{#if experimentScripts}}
{{#each experimentScripts}}
{{{this}}}
{{/each}}
{{else}}
console.log('NRBA: No experimental loaders found for this environment.')
{{/if}}
