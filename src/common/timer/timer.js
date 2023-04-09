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
    console.log('refresh the timer', this.cb)
    clearTimeout(this.timer)
    this.timer = this.create(cb, ms)
    this.startTimestamp = Date.now()
    this.remainingMs = undefined
  }

  pause () {
    clearTimeout(this.timer)
    this.remainingMs = this.initialMs - (Date.now() - this.startTimestamp)
    console.log('paused the timer with ', this.remainingMs, 'ms left')
  }

  resume () {
    if (!this.remainingMs || !this.isValid()) return
    this.timer = this.create(this.cb, this.remainingMs)
    console.log('resumed the timer with ', this.remainingMs, 'ms left')
    this.remainingMs = undefined
  }

  end () {
    console.log('ended the timer for...', this.cb)
    clearTimeout(this.timer)
    Object.assign(this, {})
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
