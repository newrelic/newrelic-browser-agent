/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function evtName (type) {
  switch (type) {
    case 'keydown':
    case 'keyup':
    case 'keypress':
      return 'typing'
    case 'mousemove':
    case 'mouseenter':
    case 'mouseleave':
    case 'mouseover':
    case 'mouseout':
      return 'mousing'
    case 'touchstart':
    case 'touchmove':
    case 'touchend':
    case 'touchcancel':
    case 'touchenter':
    case 'touchleave':
      return 'touching'
    case 'scroll':
    case 'scrollend':
      return 'scrolling'
    default:
      return type
  }
}

export function isTrivial (node) {
  const limit = 4
  return !!(node && typeof node.e === 'number' && typeof node.s === 'number' && (node.e - node.s) < limit)
}
