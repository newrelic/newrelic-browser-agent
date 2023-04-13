import { getConfigurationValue, getInfo, getRuntime, setInfo } from '../../common/config/config'
import { SessionEntity } from '../../common/session/session-entity'
import { isBrowserScope } from '../../common/util/global-scope'
import { FEATURE_NAMES } from '../../loaders/features/features'

let sessionSet = false
function checkSession (agentIdentifier) {
  if (sessionSet) return
  sessionSet = true
  getRuntime(agentIdentifier).session = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') == true
    ? new SessionEntity({ agentIdentifier, key: 'SESSION' })
    : null
  // if cookies (now session tracking) is turned off or can't get session ID, this is null

  if (isBrowserScope) { // retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s)
    const { session } = getRuntime(agentIdentifier)
    const customSessionData = session.read()?.custom

    if (customSessionData) setInfo(agentIdentifier, { ...getInfo(agentIdentifier), jsAttributes: { ...getInfo(agentIdentifier).jsAttributes, customSessionData } })
  }
}

/**
 * Centralizes the lazy loading of agent feature aggregate and instrument sources.
 *
 * This function uses two defined switch cases to allow us to easily name our chunks and re-use these
 * chunks for different agent types. We do not use template strings or string concatenation here because
 * doing so makes it much more difficult to name the chunks and forces Webpack to "guess" what the chunks
 * should be.
 * @param featureName Name of the feature to import such as ajax or session_trace
 * @param featurePart Name of the feature part to load; should be either instrument or aggregate
 * @returns {Promise<InstrumentBase|AggregateBase|null>}
 */
export function lazyLoader (agentIdentifier, featureName) {
  checkSession(agentIdentifier)

  switch (featureName) {
    case FEATURE_NAMES.ajax:
      return import(/* webpackChunkName: "ajax-aggregate" */ '../ajax/aggregate')
    case FEATURE_NAMES.jserrors:
      return import(/* webpackChunkName: "jserrors-aggregate" */ '../jserrors/aggregate')
    case FEATURE_NAMES.metrics:
      return import(/* webpackChunkName: "metrics-aggregate" */ '../metrics/aggregate')
    case FEATURE_NAMES.pageAction:
      return import(/* webpackChunkName: "page_action-aggregate" */ '../page_action/aggregate')
    case FEATURE_NAMES.pageViewEvent:
      return import(/* webpackChunkName: "page_view_event-aggregate" */ '../page_view_event/aggregate')
    case FEATURE_NAMES.pageViewTiming:
      return import(/* webpackChunkName: "page_view_timing-aggregate" */ '../page_view_timing/aggregate')
    case FEATURE_NAMES.sessionTrace:
      return import(/* webpackChunkName: "session_trace-aggregate" */ '../session_trace/aggregate')
    case FEATURE_NAMES.spa:
      return import(/* webpackChunkName: "spa-aggregate" */ '../spa/aggregate')
    default:
      throw new Error(`Attempted to load unsupported agent feature: ${featureName} ${featurePart}`)
  }
}
