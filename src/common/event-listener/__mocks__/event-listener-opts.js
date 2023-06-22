export const eventListenerOpts = jest.fn((useCapture, abortSignal) => ({
  capture: !!useCapture,
  passive: true,
  signal: abortSignal
}))
export const windowAddEventListener = jest.fn()
export const documentAddEventListener = jest.fn()
