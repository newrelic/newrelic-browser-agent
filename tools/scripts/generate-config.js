module.exports = { generateConfigFile: generateConfigFile }

function generateConfigFile(applicationID, licenseKey, beacon) {
    beacon = beacon || 'staging-bam.nr-data.net'

    var config = {
      init: {
        distributed_tracing: {
          enabled: true,
        },
      },
  
      loader_config: {
        accountID: '1',
        trustKey: '1',
        agentID: '' + applicationID,
        licenseKey: licenseKey,
        applicationID: ''+ applicationID,
      },
  
      info: {
        beacon: beacon,
        errorBeacon: beacon,
        licenseKey: licenseKey,
        applicationID: '' + applicationID,
        sa: 1,
      },
    };
  
    return `window.NREUM=${JSON.stringify(config)};`;
  }