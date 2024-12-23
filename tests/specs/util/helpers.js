import { deepmerge } from 'deepmerge-ts'

export const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}
export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}

export function testExpectedReplay ({ data, session, hasMeta, hasSnapshot, hasError, isFirstChunk, contentEncoding, decompressedBytes, appId, entityGuid, harvestId, currentUrl }) {
  expect(data.query).toMatchObject({
    browser_monitoring_key: expect.any(String),
    type: 'SessionReplay',
    app_id: appId || expect.any(String),
    protocol_version: expect.any(String),
    timestamp: expect.any(String),
    attributes: expect.any(String)
  })

  const decodedObj = decodeAttributes(data.query.attributes)

  expect(decodedObj).toMatchObject({
    ...(contentEncoding && { content_encoding: 'gzip' }),
    ...(entityGuid && { entityGuid }),
    harvestId: harvestId || expect.any(String),
    'replay.firstTimestamp': expect.any(Number),
    'replay.lastTimestamp': expect.any(Number),
    session: session || expect.any(String),
    rst: expect.any(Number),
    hasMeta: hasMeta || expect.any(Boolean),
    hasSnapshot: hasSnapshot || expect.any(Boolean),
    hasError: hasError || expect.any(Boolean),
    agentVersion: expect.any(String),
    isFirstChunk: isFirstChunk || expect.any(Boolean),
    decompressedBytes: decompressedBytes || expect.any(Number),
    'rrweb.version': expect.any(String),
    inlinedAllStylesheets: expect.any(Boolean),
    ...(currentUrl && { currentUrl })
  })

  expect(data.body).toEqual(expect.any(Array))
}

export function testExpectedTrace ({
  data,
  firstTimestamp,
  lastTimestamp,
  nodeCount,
  firstSessionHarvest,
  hasReplay,
  session,
  ptid,
  harvestId,
  entityGuid,
  currentUrl
}) {
  expect(data.query).toMatchObject({
    browser_monitoring_key: expect.any(String),
    type: 'BrowserSessionChunk',
    app_id: expect.any(String),
    protocol_version: expect.any(String),
    attributes: expect.any(String)
  })

  const decodedObj = decodeAttributes(data.query.attributes)

  expect(decodedObj).toMatchObject({
    ...(entityGuid && { entityGuid }),
    harvestId: harvestId || expect.any(String),
    'trace.firstTimestamp': firstTimestamp || expect.any(Number),
    'trace.lastTimestamp': lastTimestamp || expect.any(Number),
    'trace.nodes': nodeCount || expect.any(Number),
    ptid: ptid || expect.anything(),
    session: session || expect.any(String),
    ...(currentUrl && { currentUrl }),
    // optional attrs here
    ...(firstSessionHarvest && { firstSessionHarvest }),
    ...(hasReplay && { hasReplay })
  })

  expect(data.body).toEqual(expect.any(Array))
}

export function decodeAttributes (attributes) {
  const decodedObj = {}
  decodeURIComponent(attributes).split('&').forEach(x => {
    const [key, val] = x.split('=')
    let parsedVal
    try {
      // eval will attempt to convert the string representation of the value back into its true form
      // eslint-disable-next-line
      parsedVal = eval(val)
    } catch (err) {
      // eval will fail if it really is a string value
      parsedVal = val
    }
    decodedObj[key] = parsedVal
  })
  return decodedObj
}

export async function getDebugLogs () {
  return browser.execute(function () {
    return window.NRDEBUG_LOGS
  })
}

export async function clearDebugLogs () {
  return browser.execute(function () {
    window.NRDEBUG_LOGS = []
  })
}

export function srConfig (initOverrides = {}) {
  return deepmerge(
    {
      loader: 'spa',
      init: {
        privacy: { cookies_enabled: true },
        session_replay: { enabled: true, harvestTimeSeconds: 5 }
      }
    },
    {
      init: {
        ...initOverrides
      }
    }
  )
}

export function stConfig (initOverrides = {}) {
  return deepmerge(
    {
      loader: 'spa',
      init: {
        privacy: { cookies_enabled: true },
        session_trace: { enabled: true }
      }
    },
    {
      init: {
        ...initOverrides
      }
    }
  )
}

export async function getSR () {
  return browser.execute(function () {
    try {
      var sr = Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate
      return {
        events: (sr.recorder && sr.recorder.getEvents().events) || [],
        initialized: sr.initialized,
        recording: (sr.recorder && sr.recorder.recording) || false,
        mode: sr.mode,
        exists: true,
        blocked: sr.blocked,
        harvestTimeSeconds: sr.harvestTimeSeconds
      }
    } catch (err) {
      return {
        events: [],
        initialized: false,
        recording: false,
        exists: false,
        mode: 0,
        blocked: undefined,
        err: JSON.stringify(err)
      }
    }
  })
}
