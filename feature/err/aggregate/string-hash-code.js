function stringHashCode (string) {
  var hash = 0
  var charVal

  if (!string || !string.length) return hash
  for (var i = 0; i < string.length; i++) {
    charVal = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + charVal
    hash = hash | 0 // Convert to 32bit integer
  }
  return hash
}

module.exports = stringHashCode
