
var win = window

function getWindow() {
  return win
};

function setWindow(x) {
  win = x
}

module.exports = {
  getWindow: getWindow,
  setWindow: setWindow
}
