import { log } from "../../debug/logging"

export function setValues(obj, target) {
    if (typeof obj !== 'object') return console.error('setting a config requires an object as input')
    Object.entries(obj).forEach(([key, value]) => {
      if (Object.keys(target).includes(key)) target[key] = value
      else log(`invalid property "${key}" passed to configuration layer`)
    })
  }