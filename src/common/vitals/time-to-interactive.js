import { now } from '../timing/now'
import { VITAL_NAMES } from './constants'
import { longTask } from './long-task'
import { VitalMetric } from './vital-metric'

export const timeToInteractive = new VitalMetric(VITAL_NAMES.TIME_TO_INTERACTIVE)

let ltTimer
let latestLT
let ltUnsub
let running = false
let startTs

const setLtTimer = () => {
  clearTimeout(ltTimer)
  ltTimer = setTimeout(() => {
    timeToInteractive.update({ value: Math.max(startTs, latestLT) })
    ltUnsub()
    ltUnsub = undefined
    running = false
    latestLT = undefined
    ltTimer = undefined
  }, 5000)
}

export const start = (timestamp = now(), buffered) => {
  if (running) return
  running = true
  startTs = timestamp
  console.log('startTs...', timestamp)
  ltUnsub = longTask.subscribe(({ name, value, attrs }) => {
    latestLT = attrs.ltStart + value
    setLtTimer()
  }, buffered)
}
