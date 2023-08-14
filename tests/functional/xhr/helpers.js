/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const condition = (e) => e.type === 'ajax' && e.path === '/json'

function getXhrFromResponse (response, browser) {
  const target = response?.body || response?.query || null
  if (!target) return null
  const parsed = typeof target === 'string' ? JSON.parse(target).xhr : target.xhr
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
}

function fail (t, addlMsg = undefined) {
  return (err) => {
    t.error(err, addlMsg)
    t.end()
  }
}

module.exports = { getXhrFromResponse, fail, condition }
