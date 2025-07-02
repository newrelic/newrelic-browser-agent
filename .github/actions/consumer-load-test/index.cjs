const { args } = require('./args.cjs');
const harvestSessionReplay = require('./session-replay/session-replay-payload.cjs');
const harvestPageView = require('./page-view/page-view-payload.cjs');

let payloadsSent = 0
let concurrent = 0 // increments to 5

const start = performance.now()

async function sendRequest(instanceMarker, payloadsSentInJob = 0) {
  return new Promise(async (resolve, reject) => {
    const appId = args.appId
    const agentVersion = '0.0.1'
    const licenseKey = args.licenseKey
    const entityGuid = args.entityGuid
    const session = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const ptid = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    let harvestCount = 0;
    const timeNow = Math.floor(Date.now());
    const enduserId = 'faker-' + timeNow + '@newrelic.com';
    const offset = Math.floor(Math.random() * 10000) + 40000; // random offset between 40s and 50s

    try {
      /** PAGEVIEW HARVEST */
      if (args.pageView) await harvestPageView({
        licenseKey,
        appId,
        agentVersion,
        session,
        ptid,
        timeNow,
        offset,
        enduserId
      })

      /** SNAPSHOT HARVEST */
      if (args.sessionReplay) await harvestSessionReplay({
        licenseKey,
        appId,
        timeNow,
        offset,
        harvestCount,
        isSnapshot: true,
        entityGuid,
        session,
        agentVersion,
        ptid,
        enduserId
      })

      /** MUTATION HARVEST */
      if (args.sessionReplay) await harvestSessionReplay({
        licenseKey,
        appId,
        timeNow,
        offset,
        harvestCount: ++harvestCount,
        isSnapshot: false,
        entityGuid,
        session,
        agentVersion,
        ptid,
        enduserId
      })
      
      console.log("payloads (1 PVE + 2 SR) sent: ", ++payloadsSent, ' ||| payloads per second: ', (payloadsSent / ((performance.now() - start) / 1000)).toFixed(2));
    } catch (err) {
      console.error(`Error in instance ${instanceMarker}:`, err);
    }

    // stage with a timeout to avoid blocking the event loop and creating a memory leak
    setTimeout(async () => {
      await sendRequest(instanceMarker, payloadsSentInJob)
      resolve()
    }, 1)

  })
}

const fetches = []
while (++concurrent < 5) fetches.push(
  sendRequest(concurrent).catch(err => {
    console.error(err);
  })
)

console.log(`Spawned ${concurrent} concurrent threads`);
Promise.all(fetches).then(() => {
  const end = performance.now()
  const seconds = ((end - start) / 1000).toFixed(2);
  console.log(`All requests completed in ${seconds} seconds.`);
  console.log(payloadsSent / seconds + ' payloads per second');
}).catch(err => {
  console.error('Error in request execution:', err);
})
