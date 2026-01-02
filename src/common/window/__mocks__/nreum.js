/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const defaults = {}
export const gosNREUM = jest.fn(() => ({}))
export const gosNREUMInfo = jest.fn(() => ({}))
export const gosNREUMLoaderConfig = jest.fn(() => ({}))
export const gosNREUMInit = jest.fn(() => ({}))
export const gosNREUMOriginals = jest.fn(() => ({ o: {} }))
export const setNREUMInitializedAgent = jest.fn()
export const getNREUMInitializedAgent = jest.fn(() => ({}))
export const addToNREUM = jest.fn(() => ({}))
export const NREUMinitialized = jest.fn(() => ({}))
export const gosCDN = jest.fn(() => (newrelicGlob))

const newrelicGlob = {}
