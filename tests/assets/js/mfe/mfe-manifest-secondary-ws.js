// A secondary asset for an MFE that opens a WebSocket -- used to verify manifest-based WebSocket attribution,
// mirroring the mock echo endpoint used by tests/specs/ins/websockets.e2e.js.
window.manifestWs = new WebSocket(`ws://${window.NREUM.info.beacon}/websocket`)
