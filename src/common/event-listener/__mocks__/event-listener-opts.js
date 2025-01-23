/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const eventListenerOpts = jest.fn((useCapture, abortSignal) => ({
  capture: !!useCapture,
  passive: true,
  signal: abortSignal
}))
export const windowAddEventListener = jest.fn()
export const documentAddEventListener = jest.fn()
