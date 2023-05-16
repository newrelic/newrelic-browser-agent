import { registerHandler } from '../../common/event-emitter/register-handler'
import { FeatureBase } from './feature-base'

export class AggregateBase extends FeatureBase {
  waitForFlags (flagNames = []) {
    return Promise.all(flagNames.map(fName => new Promise((resolve) => {
      registerHandler(`feat-${fName}`, () => {
        resolve({ name: fName, value: true })
      }, this.featureName, this.ee)
      registerHandler(`block-${fName}`, () => {
        resolve({ name: fName, value: false })
      }, this.feature, this.ee)
    })
    ))
  }
}
