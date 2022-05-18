
var origWindow = window
var win = origWindow

function getWindow() {
  return win
}

function setWindow(x) {
  win = x
}

function resetWindow() {
  win = origWindow
}

module.exports = {
  getWindow: getWindow,
  setWindow: setWindow,
  resetWindow: resetWindow
}
