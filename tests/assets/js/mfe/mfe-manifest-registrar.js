// Models a platform-level registrar script: a real <script src> file that calls newrelic.register() on behalf of
// an MFE, using a manifest that names only the MFE's OWN file -- never itself. The registrar does not belong to
// the MFE team, so its own error/log/ajax activity below must never attribute to the MFE it registers.
window.manifestRegistrarApi = newrelic.register({
  id: 'manifest-registrar-mfe',
  name: 'ManifestRegistrarMFE',
  manifest: { assets: [{ matcher: 'mfe-manifest-registrar-secondary.js' }] }
})

fetch('/mock/manifest-registrar-caller')

console.log('log from manifest registrar caller')

setTimeout(() => {
  throw new Error('error from manifest registrar caller')
}, 0)
