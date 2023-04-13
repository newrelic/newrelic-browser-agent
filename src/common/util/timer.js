export class Timer {
  constructor (cb, ms) {
    this.cb = cb
    this.initialMs = ms || 0
    this.startTimestamp = Date.now()
    this.remainingMs = undefined

    this.timer = this.create(cb, ms)
  }

  create (cb, ms) {
    return setTimeout(cb || this.cb, ms || this.initialMs)
  }

  refresh (cb, ms) {
    clearTimeout(this.timer)
    this.timer = this.create(cb, ms)
    this.startTimestamp = Date.now()
    this.remainingMs = undefined
  }

  pause () {
    clearTimeout(this.timer)
    this.remainingMs = this.initialMs - (Date.now() - this.startTimestamp)
  }

  resume () {
    if (!this.remainingMs || !this.isValid()) return
    this.timer = this.create(this.cb, this.remainingMs)
    this.remainingMs = undefined
  }

  end () {
    clearTimeout(this.timer)
    Object.assign(this, {})
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
