import { originTime } from '../../../../common/constants/runtime'

/**
 * HOF that returns a function that rormats incoming page action data to align to expected shape
 * @param {Function} handler the function responsible for handling the formatted data
 * @returns {Function} the function to be provided with the actual data, will call <handler>
 */
export function formatPageAction (handler) {
  return function (timestamp, name, attributes) {
    handler({
      ...attributes,
      eventType: 'PageAction',
      timestamp: timestamp + originTime,
      timeSinceLoad: timestamp / 1000,
      actionName: name,
      browserWidth: window?.document?.documentElement?.clientWidth,
      browserHeight: window?.document?.documentElement?.clientHeight
    })
  }
}
