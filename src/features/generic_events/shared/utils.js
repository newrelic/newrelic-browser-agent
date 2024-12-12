import { FEATURE_FLAGS } from '../constants'

/**
 * Determines which datasources are enabled in the agent's configuration. This can be slightly more complicated because some datasources can be
 * enabled via feature flags while in an experimental stage on top of being enabled by configs. This helper function helps simplify the logic applied across the consumers.
 * @param {Object} init The agent's init config
 * @returns {Object} an object of the datasource statuses and a helper `anyEnabled` boolean which denotes if any of the datasources are enabled.
 */
export function getEnabledDatasources (init) {
  let anyEnabled = false
  const userActionsEnabled = init.user_actions.enabled
  if (userActionsEnabled) anyEnabled = true
  const captureMarksEnabled = init.performance.capture_marks || init.feature_flags.includes(FEATURE_FLAGS.MARKS) // experimental stage
  if (captureMarksEnabled) anyEnabled = true
  const captureMeasuresEnabled = init.performance.capture_measures || init.feature_flags.includes(FEATURE_FLAGS.MEASURES) // experimental stage
  if (captureMeasuresEnabled) anyEnabled = true
  const pageActionsEnabled = init.page_action.enabled
  if (pageActionsEnabled) anyEnabled = true
  const resourcesEnabled = init.performance.resources.enabled || init.feature_flags.includes(FEATURE_FLAGS.RESOURCES) // experimental stage
  if (resourcesEnabled) anyEnabled = true

  return {
    anyEnabled,
    datasources: {
      userActionsEnabled,
      captureMarksEnabled,
      captureMeasuresEnabled,
      pageActionsEnabled,
      resourcesEnabled
    }
  }
}
