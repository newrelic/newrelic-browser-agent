fs = require('fs');

async function sendRequest() {
  const session = 'LOADTESTING' + require('crypto').randomBytes(8).toString('hex');

  console.log("Starting request with session ID:", session);

  const ptid = require('crypto').randomBytes(8).toString('hex');
  let harvestCount = 0;
  const timeNow = Math.floor(Date.now());
  
  const snapshotHarvest = new URL('https://staging-bam.nr-data.net/browser/blobs'); // parameterize this later
  snapshotHarvest.searchParams.set('browser_monitoring_key', 'NRBR-e61e490de4259bb2686');
  snapshotHarvest.searchParams.set('type', 'SessionReplay');
  snapshotHarvest.searchParams.set('app_id', '35095249');
  snapshotHarvest.searchParams.set('protocol_version', '0');
  snapshotHarvest.searchParams.set('timestamp', (timeNow - 44188).toString());
  snapshotHarvest.searchParams.set('attributes', `content_encoding%3Dgzip%26entityGuid%3DNTUwMzUyfEJST1dTRVJ8QVBQTElDQVRJT058MzUwOTUyNDk%26harvestId%3D${session}_${ptid}_${harvestCount}%26replay.firstTimestamp%3D${timeNow - 44188}%26replay.lastTimestamp%3D${timeNow}%26replay.nodes%3D2%26session.durationMs%3D44188%26agentVersion%3D1.292.0%26session%3D${session}%26rst%3D46330%26hasMeta%3Dtrue%26hasSnapshot%3Dtrue%26hasError%3Dfalse%26isFirstChunk%3Dfalse%26decompressedBytes%3D3428269%26invalidStylesheetsDetected%3Dfalse%26inlinedAllStylesheets%3Dfalse%26rrweb.version%3D%255E2.0.0-alpha.18%26payload.type%3Dstandard%26enduser.id%3Dfaker@newrelic.com%26currentUrl%3Dhttps://staging-one.newrelic.com/catalogs/software`)

  const headers = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  }; 

  const snapshotBody = await fs.promises.readFile('./snapshot-fetch.txt', 'utf8');

  const snapshotResponse = await fetch(snapshotHarvest.toString(), {
    method: 'POST',
    headers,
    referrer: "https://staging-one.newrelic.com/",
    body: snapshotBody,
    method: "POST"
  });

  if (snapshotResponse.ok) console.log("sent requests: ", ++harvestCount);

  /** MUTATION HARVEST */

  const mutationHarvest = new URL('https://staging-bam.nr-data.net/browser/blobs'); // parameterize this later
  mutationHarvest.searchParams.set('browser_monitoring_key', 'NRBR-e61e490de4259bb2686');
  mutationHarvest.searchParams.set('type', 'SessionReplay');
  mutationHarvest.searchParams.set('app_id', '35095249');
  mutationHarvest.searchParams.set('protocol_version', '0');
  mutationHarvest.searchParams.set('timestamp', (timeNow - 44188).toString());
  mutationHarvest.searchParams.set('attributes', `content_encoding%3Dgzip%26entityGuid%3DNTUwMzUyfEJST1dTRVJ8QVBQTElDQVRJT058MzUwOTUyNDk%26harvestId%3D${session}_${ptid}_${harvestCount}%26replay.firstTimestamp%3D${timeNow - 44188}%26replay.lastTimestamp%3D${timeNow}%26replay.nodes%3D2%26session.durationMs%3D44188%26agentVersion%3D1.292.0%26session%3D${session}%26rst%3D46330%26hasMeta%3Dtrue%26hasSnapshot%3Dtrue%26hasError%3Dfalse%26isFirstChunk%3Dfalse%26decompressedBytes%3D3428269%26invalidStylesheetsDetected%3Dfalse%26inlinedAllStylesheets%3Dfalse%26rrweb.version%3D%255E2.0.0-alpha.18%26payload.type%3Dstandard%26enduser.id%3Dfaker@newrelic.com%26currentUrl%3Dhttps://staging-one.newrelic.com/catalogs/software`)

  const headers = {
    "content-type": "text/plain",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  }; 

  const snapshotBody = await fs.promises.readFile('./snapshot-fetch.txt', 'utf8');

  const snapshotResponse = await fetch(snapshotHarvest.toString(), {
    method: 'POST',
    headers,
    referrer: "https://staging-one.newrelic.com/",
    body: snapshotBody,
    method: "POST"
  });

  if (snapshotResponse.ok) console.log("sent requests: ", ++harvestCount);
}

sendRequest().catch(err => {
  console.error(err);
});