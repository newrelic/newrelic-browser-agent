const fs = require('fs')
const path = require('path')
const { paths } = require('../constants')

const srCacheDir = path.join(paths.rootDir, 'node_modules/.cache/session_replay')

module.exports.storeReplayData = async (sessionId, firstTimestamp, srEvents) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    console.warn('Could not store replay data: missing session id')
    return
  }
  if (typeof firstTimestamp !== 'string' || sessionId.trim().length === 0 || Number.isNaN(firstTimestamp)) {
    console.warn('Could not store replay data: missing first timestamp')
    return
  }
  if (!Array.isArray(srEvents) || srEvents.length === 0) {
    console.warn('Could not store replay data: missing events or events are empty')
    return
  }

  console.log(`Storing session replay data for session ${sessionId}`)
  await fs.promises.mkdir(srCacheDir, { recursive: true })
  await fs.promises.writeFile(path.join(srCacheDir, `${sessionId}_${firstTimestamp}.json`), JSON.stringify(srEvents))
}

module.exports.retrieveReplayData = async (sessionId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    console.warn('Could not retrieve replay data: missing session id')
    return []
  }

  await fs.promises.mkdir(srCacheDir, { recursive: true })
  const replayFiles = (await fs.promises.readdir(srCacheDir, { withFileTypes: true }))
    .filter(f => f.name.startsWith(sessionId))

  if (replayFiles.length === 0) {
    console.warn('Could not retrieve replay data: data not found')
    return []
  }

  const fileContents = await Promise.all(
    replayFiles
      .map(async f => await fs.promises.readFile(path.join(f.path, f.name)))
  )

  return fileContents.reduce((acc, fileContent) => {
    acc.push(...JSON.parse(fileContent.toString('utf-8')))
    return acc
  }, [])
}
