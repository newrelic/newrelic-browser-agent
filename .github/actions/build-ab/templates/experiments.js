window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'

{{#if experimentScripts}}
{{#each experimentScripts}}
{{{this}}}
{{/each}}
{{else}}
console.log('NRBA: No experimental loaders found for this environment.')
{{/if}}
