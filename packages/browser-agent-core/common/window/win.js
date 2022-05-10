
var origWindow = window
var win = origWindow

export function getWindow() {
  return win
}

export function setWindow(x) {
  win = x
}

export function resetWindow() {
  win = origWindow
}
