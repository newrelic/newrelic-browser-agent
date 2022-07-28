/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var withHash = /([^?#]*)[^#]*(#[^?]*|$).*/
var withoutHash = /([^?#]*)().*/
export function cleanURL (url, keepHash) {
  return url.replace(keepHash ? withHash : withoutHash, '$1$2')
}