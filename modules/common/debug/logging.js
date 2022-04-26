import { getRuntime } from '../config/config'

export function log() {
  if (getRuntime().debug) console.debug(...arguments)
}
