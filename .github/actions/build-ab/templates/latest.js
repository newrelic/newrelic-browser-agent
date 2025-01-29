window.NREUM.loader_config.agentID = '{{{args.abAppId}}}'
window.NREUM.loader_config.applicationID = '{{{args.abAppId}}}'
window.NREUM.loader_config.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.info.applicationID = '{{{args.abAppId}}}'
window.NREUM.info.licenseKey = '{{{args.abLicenseKey}}}'
window.NREUM.init.proxy.assets = 'https://staging-js-agent.newrelic.com/dev'
window.NREUM.init.feature_flags = ['soft_nav','ajax_metrics_deny_list']
window.NREUM.init.session_replay.enabled = false // disabled for now to not double wrap the page which can cause extra processing burden
window.NREUM.init.session_trace.enabled = false // disabled for now to not double wrap the page which can cause extra processing burden
window.NREUM.init.user_actions = {elementAttributes: ['id', 'className', 'tagName', 'type', 'innerText', 'textContent', 'ariaLabel', 'alt', 'title']}

{{{latestScript}}}
