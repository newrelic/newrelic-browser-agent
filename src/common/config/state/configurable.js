import { warn } from '../../util/console'

export function getModeledObject (obj, model) {
  try {
    if (!obj || typeof obj !== 'object') return warn('Setting a Configurable requires an object as input')
    if (!model || typeof model !== 'object') return warn('Setting a Configurable requires a model to set its initial properties')
    // allow getters and setters to pass from model to target
    const output = Object.create(
      Object.getPrototypeOf(model),
      Object.getOwnPropertyDescriptors(model)
    )
    for (let key in output) {
      if (obj[key] !== undefined) {
        try {
          if (typeof obj[key] === 'object' && typeof model[key] === 'object') output[key] = getModeledObject(obj[key], model[key])
          else output[key] = obj[key]
        } catch (e) {
          warn('An error occurred while setting a property of a Configurable', e)
        }
      }
    }
    return output
  } catch (err) {
    warn('An error occured while setting a Configurable', err)
  }
}
