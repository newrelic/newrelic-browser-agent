
export class Timer {
  constructor (opts, ms) {
    if (!opts.onEnd) throw new Error('onEnd handler is required')
    if (!ms) throw new Error('ms duration is required')
    this.onEnd = opts.onEnd
    this.initialMs = ms
    this.startTimestamp = Date.now()
    // used by pause/resume
    this.remainingMs = undefined

    this.timer = this.create(this.onEnd, ms)
  }

  create (cb, ms) {
    if (this.timer) this.clear()
    return setTimeout(() => cb ? cb() : this.onEnd(), ms || this.initialMs)
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

  clear () {
    clearTimeout(this.timer)
    this.timer = null
  }

  end () {
    this.clear()
    this.onEnd()
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
