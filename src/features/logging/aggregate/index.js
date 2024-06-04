import { getRuntime } from '../../../common/config/config'
import { registerHandler } from '../../../common/event-emitter/register-handler'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME, LOGGING_EVENT_EMITTER_TYPES } from '../constants'
import { Log } from '../shared/log'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)

    this.logs = []
    this.agentRuntime = getRuntime(this.agentIdentifier)

    this.waitForFlags([]).then(() => {
      registerHandler(LOGGING_EVENT_EMITTER_TYPES.LOG, (...args) => this.handleLog(...args), this.featureName, this.ee)
      this.drain()
    })
  }

  handleLog (timestamp, message, attributes, level) {
    this.logs.push(
      new Log(
        this.agentRuntime.timeKeeper.convertRelativeTimestamp(timestamp),
        message,
        attributes,
        level
      )
    )
  }
}
