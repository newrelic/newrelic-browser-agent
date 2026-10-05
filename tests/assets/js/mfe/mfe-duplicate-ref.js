// Loaded more than once via separate <script src> tags. Exposes a function (defined in this file, so register() calls
// from it are attributed to this script) that the test invokes after every copy has loaded.
window.registerDuplicateRef = function (id) {
  return newrelic.register({ id, name: 'Duplicate Ref' })
}
