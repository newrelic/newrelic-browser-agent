// The MFE's own file, named in mfe-manifest-registrar.js's manifest -- its activity SHOULD attribute to the MFE.
fetch('/mock/manifest-registrar-secondary')

console.log('log from manifest registrar secondary asset')

setTimeout(() => {
  throw new Error('error from manifest registrar secondary asset')
}, 0)
