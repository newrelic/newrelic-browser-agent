/**
 * Simulates the customer-reported bug (NR-586577): a single MFE bundle calling `newrelic.register()`
 * many times (e.g. once per rendered component instance) instead of once per bundle. Auto-instrumented
 * events (AJAX, console logs, JS errors) triggered from this script should be reported once, regardless
 * of how many times it registered -- while explicit register-API calls and MicroFrontEndTiming should
 * remain per-registration.
 */
const REGISTRATION_COUNT = 30

// all 30 registrations use the SAME id/name -- this is the reported bug: one logical MFE
// registered repeatedly (e.g. once per rendered component instance) instead of once per bundle
window.__dedupApis = []
for (let i = 0; i < REGISTRATION_COUNT; i++) {
  window.__dedupApis.push(newrelic.register({ id: 'dedup-mfe', name: 'DedupMFE' }))
}

// explicit API-driven calls are tied to a specific instance and must remain per-instance (not deduped)
window.__dedupApis.forEach((api, i) => api.log(`explicit log ${i}`))

// auto-instrumented AJAX call -- should be reported once, not once per duplicate registration
fetch('/dedup-marker-test').catch(() => {})

// auto-captured console log -- should be reported once
console.log('auto captured log from mfe-dedup.js')

// auto-captured uncaught error -- should be reported once
setTimeout(() => {
  throw new Error('auto captured error from mfe-dedup.js')
}, 0)

window.__deregisterDedupApis = () => window.__dedupApis.forEach(api => api.deregister())
