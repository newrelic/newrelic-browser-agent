/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isBrowserScope } from '../util/global-scope'

// TO DO: this entire file & ieVersion descendents are severely outdated and can be scraped

let len;
if (isBrowserScope) {
  const div = document.createElement('div')

  div.innerHTML = '<!--[if lte IE 6]><div></div><![endif]-->' +
    '<!--[if lte IE 7]><div></div><![endif]-->' +
    '<!--[if lte IE 8]><div></div><![endif]-->' +
    '<!--[if lte IE 9]><div></div><![endif]-->'

  len = div.getElementsByTagName('div').length
}

export var ieVersion
if (len === 4) ieVersion = 6
else if (len === 3) ieVersion = 7
else if (len === 2) ieVersion = 8
else if (len === 1) ieVersion = 9
else ieVersion = 0
