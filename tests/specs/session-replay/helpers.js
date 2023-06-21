import { deepmerge } from 'deepmerge-ts'

export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
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
