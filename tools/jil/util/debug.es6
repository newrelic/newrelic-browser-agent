const fs = require('fs')

export function logToFile (filename, data) {
  if (typeof data === 'object') data = JSON.stringify(data, null, 2)
  fs.appendFileSync(filename, data + '\n')
}
