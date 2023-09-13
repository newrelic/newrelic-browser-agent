import { longTask } from '../vitals/long-task'

export class TimeToInteractive {
  #ltTimer
  #latestLT
  #ltUnsub
  #startTimestamp
  #resolver
  #rejector
  #longTasks = 0

  start ({ startTimestamp, buffered = false }) {
    this.#startTimestamp = startTimestamp
    this.#ltUnsub = longTask.subscribe(({ name, value, attrs }) => {
      this.#latestLT = attrs.ltStart + value
      this.#longTasks++
      this.#setLtTimer()
    }, buffered)
    return new Promise((resolve, reject) => {
      this.#resolver = resolve
      this.#rejector = reject
    })
  }

  cancel () {
    clearTimeout(this.#ltTimer)
    this.#ltUnsub()
    // this.#rejector()
  }

  #setLtTimer () {
    clearTimeout(this.#ltTimer)
    this.#ltTimer = setTimeout(() => {
      this.#resolver({ value: Math.round(Math.max(this.#startTimestamp, this.#latestLT)), attrs: { startTimestamp: this.#startTimestamp, longTasks: this.#longTasks } })
      this.#ltUnsub()
    }, 5000)
  }
}
