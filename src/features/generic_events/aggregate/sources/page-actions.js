const { originTime } = require('../../../../common/constants/runtime')

export function handlePageAction (timestamp, name, attributes, handler) {
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
