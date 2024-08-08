export const TimeKeeper = jest.fn(function () {
  this.ready = true
  this.convertRelativeTimestamp = jest.fn()
})
