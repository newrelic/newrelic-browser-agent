export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
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
    var sr = Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate
    return {
      events: sr.events,
      initialized: sr.initialized,
      recording: sr.recording
    }
  })
}
