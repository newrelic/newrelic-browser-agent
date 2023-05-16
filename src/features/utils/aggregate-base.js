import { registerHandler } from '../../common/event-emitter/register-handler'
import { FeatureBase } from './feature-base'

export class AggregateBase extends FeatureBase {
  waitForFlags (flagNames = [], group, ee) {
    return Promise.all(flagNames.map(fName => new Promise((resolve) => {
      registerHandler(`feat-${fName}`, () => {
        resolve({ name: fName, value: true })
      }, group, ee)
      registerHandler(`block-${fName}`, () => {
        resolve({ name: fName, value: false })
      }, group, ee)
    })
    ))
  }
}
