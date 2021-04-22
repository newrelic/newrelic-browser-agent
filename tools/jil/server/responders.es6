/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import url from 'url'
import querypack from '@newrelic/nr-querypack'

let responders = {}
export default responders

responders['GET /1/{key}'] = rumData
responders['POST /1/{key}'] = rumData

responders['GET /events/1/{key}'] = eventsData
responders['POST /events/1/{key}'] = eventsData

responders['GET /jserrors/1/{key}'] = jserrorsData
responders['POST /jserrors/1/{key}'] = jserrorsData

responders['GET /ins/1/{key}'] = insData
responders['POST /ins/1/{key}'] = insData

responders['GET /resources/1/{key}'] = resourcesData
responders['POST /resources/1/{key}'] = resourcesData

function rumData (req, res, handle) {
  let parsed = url.parse(req.url, true)
  res.writeHead(200)

  if (!parsed.query.jsonp) return res.end()
  res.end(`${parsed.query.jsonp}(${JSON.stringify(handle.flags)})`)
}

function eventsData (req, res, handle, data) {
  let parsed = url.parse(req.url, true)
  let scheduledResponse
  if (data) {
    let decoded = querypack.decode(data && data.length ? data : parsed.query.e)[0]
    if (decoded.type === 'timing') {
      scheduledResponse = handle.getNextScheduledResponse('timings')
    } else {
      scheduledResponse = handle.getNextScheduledResponse('events')
    }
  }
  const statusCode = scheduledResponse && scheduledResponse.statusCode || 200
  res.writeHead(statusCode)
  res.end()
}

function insData (req, res, handle) {
  const scheduledResponse = handle.getNextScheduledResponse('ins')
  const statusCode = scheduledResponse && scheduledResponse.statusCode || 200
  res.writeHead(statusCode)
  res.end()
}

function resourcesData (req, res, handle) {
  const scheduledResponse = handle.getNextScheduledResponse('resources')
  const statusCode = scheduledResponse && scheduledResponse.statusCode || 200
  res.writeHead(statusCode)
  res.end('123-456')
}

function jserrorsData (req, res, handle) {
  const scheduledResponse = handle.getNextScheduledResponse('jserrors')
  const statusCode = scheduledResponse && scheduledResponse.statusCode || 200
  res.writeHead(statusCode)
  res.end()
}
