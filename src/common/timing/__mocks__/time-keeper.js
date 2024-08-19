export const TimeKeeper = jest.fn(function () {
  this.ready = true
  this.convertRelativeTimestamp = jest.fn()
  this.convertAbsoluteTimestamp = jest.fn()
  this.correctAbsoluteTimestamp = jest.fn()
})
