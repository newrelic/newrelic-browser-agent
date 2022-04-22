import { log } from "../../debug/logging"
import { gosNREUMInitializedAgents } from "../../window/nreum"

export const id = Math.floor(Math.random() * Date.now())

export function setValues(obj, target, name) {
    if (typeof obj !== 'object') return console.error('setting a config requires an object as input')
    Object.entries(obj).forEach(([key, value]) => {
      if (Object.keys(target).includes(key)) target[key] = value
      else log(`invalid property "${key}" passed to configuration layer`)
    })
    gosNREUMInitializedAgents(id, target, name)
  }