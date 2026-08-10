// A secondary asset for an MFE that is *not* the script that called register() -- it is only known to the
// agent because it's listed in that MFE's manifest. Used to verify manifest-based event attribution end-to-end.
fetch('/mock/manifest-secondary')

setTimeout(() => {
  throw new Error('error from manifest secondary asset')
}, 0)
