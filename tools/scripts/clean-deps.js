// This is a browserify plugin that removes each entry from the deps list of a
// module where the key and value are identical in order to save space in the
// final output.
//
// It's meant to be used downstream of bundle-collapser, which will transform
// the deps list in such a way that the keys and values are always identical.

var through = require('through2')

module.exports = function apply (b, opts) {
  b.pipeline.get('label').push(through.obj(function (row, enc, next) {
    for (var key in row.deps) {
      if (row.deps[key] && row.deps[key].toString() === key.toString()) delete row.deps[key]
    }

    this.push(row)
    next()
  }))
  b.once('reset', function () { apply(b, opts) })
}
