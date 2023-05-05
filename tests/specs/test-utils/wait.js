module.exports = function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
