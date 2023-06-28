import { deepmerge } from 'deepmerge-ts'

export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}

export function testExpectedReplay ({ data, session, hasSnapshot, hasError, isFirstChunk, contentEncoding, decompressedBytes }) {
  expect(data.query).toMatchObject({
    browser_monitoring_key: expect.any(String),
    type: 'SessionReplay',
    app_id: expect.any(String),
    protocol_version: expect.any(String),
    attributes: expect.any(String)
  })

  const decodedObj = decodeAttributes(data.query.attributes)

  expect(decodedObj).toMatchObject({
    ...(contentEncoding && { content_encoding: 'gzip' }),
    'replay.firstTimestamp': expect.any(Number),
    'replay.lastTimestamp': expect.any(Number),
    'replay.durationMs': expect.any(Number),
    session: session || expect.any(String),
    hasSnapshot: hasSnapshot || expect.any(Boolean),
    hasError: hasError || expect.any(Boolean),
    agentVersion: expect.any(String),
    isFirstChunk: isFirstChunk || expect.any(Boolean),
    decompressedBytes: decompressedBytes || expect.any(Number),
    'nr.rrweb.version': expect.any(String)
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

export function config (initOverrides = {}) {
  return deepmerge(
    {
      loader: 'experimental',
      init: {
        privacy: { cookies_enabled: true },
        session_replay: { enabled: true, harvestTimeSeconds: 5, sampleRate: 1, errorSampleRate: 0 }
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
        events: sr.events,
        initialized: sr.initialized,
        recording: sr.recording,
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
        blocked: undefined
      }
    }
  })
}
