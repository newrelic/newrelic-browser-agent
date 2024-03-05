/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { offset } from '../constants/runtime'
import { EventMessenger } from './event-messenger'

class PageActions extends EventMessenger {
  addPageAction (t, name = '', attributes = {}) {
    this.emit({
      value: {
        ...attributes,
        eventType: 'PageAction',
        timestamp: Math.floor(t + offset),
        timeSinceLoad: t / 1000,
        actionName: name,
        browserWidth: window?.document?.documentElement?.clientWidth,
        browserHeight: window?.document?.documentElement?.clientHeight
      }
    })
  }
}

export const pageActions = new PageActions()
