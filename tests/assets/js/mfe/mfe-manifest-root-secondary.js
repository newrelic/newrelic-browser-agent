// A secondary asset for mfe-manifest-root.js -- kept separate from the other manifest secondary fixtures so its
// messages/paths never collide with those tests.
fetch('/mock/manifest-root-secondary')

console.log('log from manifest root secondary asset')

setTimeout(() => {
  throw new Error('error from manifest root secondary asset')
}, 0)
