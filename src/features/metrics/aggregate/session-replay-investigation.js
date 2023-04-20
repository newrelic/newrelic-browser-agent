import { record } from 'rrweb'
import { getFrameworks } from '../../../common/metrics/framework-detection'
import { stringify } from '../../../common/util/stringify'

export const metrics = {
  Nodes: 0,
  Bytes: 0,
  InitialSnapshotBytes: 0,
  BytesPerMinute: 0
}

const commonSpaApps = ['React', 'Angular', 'AngularJS', 'Vue']
export const type = commonSpaApps.some(a => getFrameworks().includes(a)) ? 'Spa' : 'Standard'

const stopRecording = record({
  emit: (event, isCheckout) => {
    metrics.nodes++
    const bytes = stringify(event).length
    if (isCheckout || metrics.nodes === 1) metrics.initialSnapshotBytes += bytes
    metrics.bytes += bytes
    metrics.bytesPerMinute = (bytes / performance.now()) / 60000
  }
})

//stop recording after 5 minutes
setTimeout(stopRecording, 300000)
