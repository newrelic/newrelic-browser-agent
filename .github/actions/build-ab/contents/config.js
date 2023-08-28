
import { args } from '../args.js'
export const config = {
    init: {
      distributed_tracing: {
        enabled: true
      },
      ajax: {
        deny_list: [
          'nr-data.net',
          'bam.nr-data.net',
          'staging-bam.nr-data.net',
          'bam-cell.nr-data.net'
        ]
      },
      session_replay: {
        enabled: true,
        sampleRate: 0.5,
        errorSampleRate: 1,
        autoStart: false
      }
    },
  
    loader_config: {
      accountID: '1',
      trustKey: '1',
      agentID: args.appId,
      licenseKey: args.licenseKey,
      applicationID: args.appId
    },
  
    info: {
      beacon: 'staging-bam.nr-data.net',
      errorBeacon: 'staging-bam.nr-data.net',
      licenseKey: args.licenseKey,
      applicationID: args.appId,
      sa: 1
    }
  }