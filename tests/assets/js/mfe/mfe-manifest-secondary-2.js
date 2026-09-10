// A second, independent secondary asset for the same MFE as mfe-manifest-secondary.js -- used to verify that
// TWO distinct manifest-listed scripts (not just one) each independently attribute their own events to the MFE.
fetch('/mock/manifest-secondary-2')

console.log('log from manifest secondary asset 2')

setTimeout(() => {
  throw new Error('error from manifest secondary asset 2')
}, 0)
