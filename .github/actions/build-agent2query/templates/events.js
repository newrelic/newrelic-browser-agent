/** BrowserInteraction, PageView, PageViewTiming, SessionReplay & SessionTrace occur automatically **/

const agentRuntime = Object.values(newrelic.initializedAgents)[0].runtime
newrelic.setApplicationVersion(agentRuntime.version)
newrelic.setCustomAttribute('loaderType', agentRuntime.loaderType)

newrelic.setUserId('Agent2Query')

/** AjaxRequest **/
fetch('')

/** Custom Event **/
newrelic.recordCustomEvent('test', { foo: 'bar' })

/** JavaScriptError **/
newrelic.noticeError(new Error('test'))

/** Log **/
newrelic.log('test')

/** Mark **/
performance.mark('test')

/** Measure **/
performance.measure('test', 'test')

/** PageAction **/
newrelic.addPageAction('test', { foo: 'bar' })

/** UserAction **/
document.body.click()
window.dispatchEvent(new Event('blur')) // force the click to harvest
