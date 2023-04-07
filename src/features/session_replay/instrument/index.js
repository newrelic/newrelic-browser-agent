
import { getRuntime } from '../../../common/config/config'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)

    const { session } = getRuntime(this.agentIdentifier)
    // if this isnt the FIRST load of a session AND
    // we are not actively recording SR... DO NOT IMPORT the aggregator
    // session replay samples can only be decided on the first load of a session
    // session replays can continue if in progress
    if (!session.isNew && !session.sessionReplayActive) {
      console.log('session is not new and session replay is not active', session)
      return
    }
    console.log('import!', session)
    this.importAggregator()
  }
}
