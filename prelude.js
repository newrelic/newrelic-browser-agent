// prelude.js edited from: https://github.com/substack/browser-pack/blob/master/prelude.js

// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require

(function (modules, cache, entry) { // eslint-disable-line no-extra-parens
  function newRequire (name) {
    if (!cache[name]) {
      var m = cache[name] = {exports: {}}
      modules[name][0].call(m.exports, function (x) {
        var id = modules[name][1][x]
        return newRequire(id || x)
      }, m, m.exports)
    }
    return cache[name].exports
  }

  // If there is already an agent on the page, use it instead.
  if (typeof __nr_require === 'function') return __nr_require

  for (var i = 0; i < entry.length; i++) newRequire(entry[i])

  return newRequire
})
