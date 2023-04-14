export class Timer {
  constructor (cb, ms) {
    this.cb = cb
    this.initialMs = ms || 0
    this.startTimestamp = Date.now()
    this.remainingMs = undefined

    this.timer = this.create(cb, ms)
  }

  create (cb, ms) {
    if (this.timer) this.clear()
    return setTimeout(cb || this.cb, ms || this.initialMs)
  }

  refresh (cb, ms) {
    console.log('refresh timer')
    this.clear()
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
    this.timer = null
    Object.assign(this, {})
  }

  clear () {
    clearTimeout(this.timer)
    this.timer = null
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
