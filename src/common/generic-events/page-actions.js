
/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { offset } from '../constants/runtime'
import { EventMessenger } from './event-messenger'

export const pageActions = new EventMessenger()

export function addPageAction (t, name = '', attributes = {}) {
  pageActions.emit({
    value: {
      ...attributes,
      eventType: 'PageAction',
      timestamp: t + offset,
      timestampOffset: t,
      timeSinceLoad: t / 1000,
      actionName: name,
      browserWidth: window?.document?.documentElement?.clientWidth,
      browserHeight: window?.document?.documentElement?.clientHeight
    }
  })
}
