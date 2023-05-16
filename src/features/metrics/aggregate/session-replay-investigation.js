import { record } from 'rrweb'
import { stringify } from '../../../common/util/stringify'
import { gzip, strToU8 } from 'fflate'
import { warn } from '../../../common/util/console'

export const metrics = {
  Nodes: 0,
  Bytes: 0,
  InitialSnapshotBytes: 0,
  InitialSnapshotBytesCompressed: 0,
  BytesPerMinute: 0,
  NodesPerMinute: 0,
  MaxTimeHit: 0
}

export let type = 'Standard'
window.addEventListener('popstate', function () {
  type = 'Spa'
})

let stopRecording = () => {}
try {
  stopRecording = record({
    maskAllInputs: true,
    maskTextSelector: '*',
    inlineStylesheet: false,
    slimDOMOptions: {
      script: true,
      comment: true,
      headFavicon: true,
      headWhitespace: true,
      headMetaDescKeywords: true,
      headMetaSocial: true,
      headMetaRobots: true,
      headMetaHttpEquiv: true,
      headMetaAuthorship: true,
      headMetaVerification: true
    },
    sampling: {
      mousemove: false,
      mouseInteraction: false,
      scroll: 150, // do not emit twice in 150ms
      media: 800,
      input: 'last' // When input multiple characters, only record the final input
    },
    emit: (event) => {
      try {
        metrics.Nodes++
        const jsonStr = stringify(event)
        const bytes = jsonStr.length
        if (metrics.Nodes === 2) {
          gzip(strToU8(jsonStr), (err, data) => {
            if (err) return
            metrics.InitialSnapshotBytesCompressed = data.length
          })
          metrics.InitialSnapshotBytes += jsonStr.length
        }
        metrics.Bytes += bytes
        metrics.BytesPerMinute = Math.round(metrics.Bytes / performance.now() * 60000)
        metrics.NodesPerMinute = Math.round(metrics.Nodes / performance.now() * 60000)
      } catch (e) {
        // something went wrong while emitting
        warn('SR Metrics E', e)
      }
    }
  })
} catch (err) {
  // something went wrong when starting up rrweb
  warn('SR Metrics ERR', err)
}

// stop recording after 5 minutes
setTimeout(() => {
  metrics.MaxTimeHit++
  stopRecording()
}, 300000)
