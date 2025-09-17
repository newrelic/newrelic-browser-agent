window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.init.proxy = {} // Proxy won't work for experiments
window.NREUM.init.session_replay.enabled = true // feature is enabled, but the app settings will have sampling at 0.  We can proactively enable SR for certain test cases through app settings
window.NREUM.init.session_trace.enabled = true // feature is enabled, but the app settings will have sampling at 0.  We can proactively enable SR for certain test cases through app settings
window.NREUM.init.feature_flags = ['ajax_metrics_deny_list','soft_nav']
window.NREUM.init.user_actions = {elementAttributes: ['id', 'className', 'tagName', 'type', 'ariaLabel', 'alt', 'title']}

{{#if experimentScripts}}
{{#each experimentScripts}}
{{{this}}}
{{/each}}
{{else}}
console.log('NRBA: No experimental loaders found for this environment.')
{{/if}}
