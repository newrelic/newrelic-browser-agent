const replayBuffer = new Map()

const getReplayData = (sessionId) => replayBuffer.get(sessionId)

const setReplayData = (sessionId, data) => replayBuffer.set(sessionId, [...(getReplayData(sessionId) || []), ...data])

function decodeAttributes (attributes) {
  const decodedObj = {}
  decodeURIComponent(attributes).split('&').forEach(x => {
    const [key, val] = x.split('=')
    let parsedVal
    try {
      // eval will attempt to convert the string representation of the value back into its true form
      // eslint-disable-next-line
        parsedVal = eval(val)
    } catch (err) {
      // eval will fail if it really is a string value
      parsedVal = val
    }
    decodedObj[key] = parsedVal
  })
  return decodedObj
}

module.exports = {
  replayBuffer,
  getReplayData,
  setReplayData,
  decodeAttributes
}
