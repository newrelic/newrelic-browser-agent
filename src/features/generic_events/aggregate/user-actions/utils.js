/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if the element is visible in the DOM
 * @param elem
 * @returns {boolean|boolean}
 */
export function isVisible (elem) {
  return (typeof elem.checkVisibility === 'function')
    ? elem.checkVisibility()
    : !(elem.style.display === 'none' ||
      elem.style.visibility === 'hidden' ||
      elem.style.contentVisibility === 'hidden' ||
      elem.style.opacity === '0' ||
      elem.style.visibility === 'collapse' ||
      (elem.offsetWidth <= 0 && elem.offsetHeight <= 0) ||
      (typeof elem.getBoundingClientRect === 'function' && (elem.getBoundingClientRect().width <= 0 && elem.getBoundingClientRect().height <= 0)))
}
