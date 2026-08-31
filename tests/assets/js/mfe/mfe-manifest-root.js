// An MFE's own root file -- unlike the rest of the manifest suite (which registers from an inline
// browser.execute() call), this script calls newrelic.register() itself, from a real <script src> tag, with a
// manifest pointing at a secondary file it doesn't otherwise reference. Used to verify manifest-based attribution
// still works when the registering script is a genuine file rather than an inline eval.
window.manifestRootApi = newrelic.register({
  id: 'manifest-root-mfe',
  name: 'ManifestRootMFE',
  manifest: { assets: [{ matcher: 'mfe-manifest-root-secondary.js' }] }
})
