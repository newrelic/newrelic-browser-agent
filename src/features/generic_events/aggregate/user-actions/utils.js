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
  if (!elem || !elem.nodeType || elem.nodeType !== Node.ELEMENT_NODE) return false
  return (typeof elem.checkVisibility === 'function' && elem.checkVisibility()) || checkVisibility(elem)
}

function checkVisibility (elem) {
  const style = (typeof window.getComputedStyle === 'function' && window.getComputedStyle(elem)) ?? {}
  return !(style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.contentVisibility === 'hidden' ||
    style.opacity === '0' ||
    style.visibility === 'collapse' ||
    (elem.offsetWidth <= 0 && elem.offsetHeight <= 0) ||
    (typeof elem.getBoundingClientRect === 'function' && (elem.getBoundingClientRect().width <= 0 && elem.getBoundingClientRect().height <= 0)))
}
