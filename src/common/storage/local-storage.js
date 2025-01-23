/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class LocalStorage {
  get (key) {
    try {
      // localStorage strangely type-casts non-existing data to "null"...
      // Cast it back to undefined if it doesnt exist
      return localStorage.getItem(key) || undefined
    } catch (err) {
      // Error is ignored
      return ''
    }
  }

  set (key, value) {
    try {
      if (value === undefined || value === null) return this.remove(key)
      return localStorage.setItem(key, value)
    } catch (err) {
      // Error is ignored
    }
  }

  remove (key) {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      // Error is ignored
    }
  }
}
