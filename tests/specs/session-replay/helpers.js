export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}

export function testExpectedReplay ({ data, session, hasSnapshot, hasError, isFirstChunk, contentEncoding }) {
  expect(data.query).toMatchObject({
    protocol_version: '0',
    ...(contentEncoding && { content_encoding: 'gzip' }),
    browser_monitoring_key: expect.any(String)
  })

  expect(data.body).toMatchObject({
    type: 'SessionReplay',
    appId: expect.any(Number),
    blob: expect.any(String),
    attributes: {
      'replay.timestamp': expect.any(Number),
      session: session || expect.any(String),
      hasSnapshot: hasSnapshot || expect.any(Boolean),
      hasError: hasError || expect.any(Boolean),
      agentVersion: expect.any(String),
      isFirstChunk: isFirstChunk || expect.any(Boolean),
      'nr.rrweb.version': expect.any(String)
    }
  })
}

export function config (props = {}) {
  return {
    loader: 'experimental',
    init: {
      privacy: { cookies_enabled: true },
      session_replay: { enabled: true, harvestTimeSeconds: 5, sampleRate: 1, errorSampleRate: 0, ...props }
    }
  }
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
