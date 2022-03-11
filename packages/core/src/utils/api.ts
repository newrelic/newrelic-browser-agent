import { now } from '../../../../modules/common/timing/now'
import { handle } from '../../../../modules/common/event-emitter/handle'
import { recordSupportability } from '../../../../modules/common/metrics/metrics'
import { NrStoreError } from '../types'

export function recordError(err: string | Error, customAttributes, time) {
    if (typeof err === 'string') err = new Error(err)
    recordSupportability('API/noticeError/called')
    time = time || now()
    handle('err', [err, time, false, customAttributes])
  }
  
export function recordPageAction() {

}

export function storeError(err: Error | String, time?: Number, internal?: any, customAttributes?: any): void {
    // this gets replaced by the error feature module
    // if the error feature module is disabled, this function throws a warning message
    console.warn(`The JS-Errors Feature of the New Relic Browser Agent Has Been Disabled. Method "storeError" will not do anything!`)
}