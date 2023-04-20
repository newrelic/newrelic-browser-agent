import { record } from 'rrweb'
import { stringify } from '../../../common/util/stringify'
import { gzip, strToU8 } from 'fflate'

export const metrics = {
  Nodes: 0,
  Bytes: 0,
  InitialSnapshotBytes: 0,
  InitialSnapshotBytesCompressed: 0,
  BytesPerMinute: 0,
  NodesPerMinute: 0
}

export let type = 'Standard'
window.addEventListener('popstate', function () {
  type = 'Spa'
})

const stopRecording = record({
  emit: (event) => {
    metrics.Nodes++
    const jsonStr = stringify(event)
    const bytes = jsonStr.length
    if (metrics.Nodes === 2) {
      gzip(strToU8(jsonStr), (err, data) => {
        if (err) return
        metrics.InitialSnapshotBytesCompressed = data.length
      })
      metrics.InitialSnapshotBytes += jsonStr.length // compressed string?
    }
    metrics.Bytes += bytes
    metrics.BytesPerMinute = Math.round(metrics.Bytes / performance.now() * 60000)
    metrics.NodesPerMinute = Math.round(metrics.Nodes / performance.now() * 60000)
  }
})

//stop recording after 5 minutes
setTimeout(stopRecording, 300000)
