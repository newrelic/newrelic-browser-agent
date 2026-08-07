// Simulates a SPA that mounts a MFE, then remounts the SAME MFE (same id) much later
// WITHOUT this script ever reloading. Both register() calls execute from this same script file,
// so they resolve to the same underlying ScriptCorrelation -- this is the exact scenario the
// stale-correlation staleness check in findScriptTimings()/script-correlation.js guards against.

const REMOUNT_MFE_ID = 'remount-mfe'

function mountRemountContent (label) {
  const div = document.createElement('div')
  div.textContent = label
  div.dataset.nrMfeId = REMOUNT_MFE_ID
  div.style.width = '100px'
  div.style.height = '100px'
  document.body.appendChild(div)
}

window.remountApis = window.remountApis || {}

// First mount -- happens as soon as this script loads, same as any normal MFE registration.
window.remountApis.first = newrelic.register({
  id: REMOUNT_MFE_ID,
  name: 'Remount First'
})
mountRemountContent('First mount content')

// Exposed so the test can simulate the SPA remounting the same MFE well after the fact.
window.remountAgain = function () {
  window.remountApis.second = newrelic.register({
    id: REMOUNT_MFE_ID,
    name: 'Remount Second'
  })
  mountRemountContent('Remount content')
}
