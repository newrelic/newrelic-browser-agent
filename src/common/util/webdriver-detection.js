/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Detects if the page is being controlled by WebDriver or automation tools derived from it.
 * Checks for common indicators including:
 * - navigator.webdriver property (standard WebDriver flag)
 * - window.document.__webdriver_evaluate (WebDriver internal property)
 * - window.document.__selenium_unwrapped (Selenium property)
 * - window.document.__driver_evaluate (WebDriver internal property)
 * - window.document.__webdriver_script_function (WebDriver internal property)
 * - window.callPhantom (PhantomJS property)
 * - window._phantom (PhantomJS property)
 * - window.__nightmare (Nightmare.js property)
 * - window.domAutomation (Chrome automation property)
 * - window.domAutomationController (Chrome automation property)
 *
 * @type {boolean}
 */
export const webdriverDetected = (() => {
  try {
    // Standard WebDriver flag
    if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
      return true
    }

    // Check for various automation-related properties
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // WebDriver internal properties
      if (document.__webdriver_evaluate ||
          document.__selenium_unwrapped ||
          document.__driver_evaluate ||
          document.__webdriver_script_function) {
        return true
      }

      // PhantomJS detection
      if (window.callPhantom || window._phantom) {
        return true
      }

      // Nightmare.js detection
      if (window.__nightmare) {
        return true
      }
    }

    return false
  } catch (err) {
    // If any errors occur during detection, assume not automated
    return false
  }
})()
