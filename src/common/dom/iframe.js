export function isIFrameWindow (windowObject) {
  if (!windowObject) return false
  return windowObject.self !== windowObject.top
}
