const headers = {
  "content-type": "text/plain",
  "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\""
};

module.exports = async function ({
  licenseKey,
  appId,
  agentVersion,
  session,
  ptid,
  timeNow,
  offset,
  enduserId,
  payloadMetadata = { payloadsSentInJob: 0 }
}) {
  const request = new URL(`https://staging-bam.nr-data.net/1/${licenseKey}`); // parameterize this later
  request.searchParams.set('a', appId);
  request.searchParams.set('sa', '1');
  request.searchParams.set('v', agentVersion);
  request.searchParams.set('t', 'Unnamed%20Transaction');
  request.searchParams.set('rst', '1891');
  request.searchParams.set('ck', '0');
  request.searchParams.set('s', session);
  request.searchParams.set('ptid', ptid);
  request.searchParams.set('ref', 'https://staging-one.newrelic.com/catalogs/software');
  request.searchParams.set('ht', '1');
  request.searchParams.set('hr', '1');
  request.searchParams.set('af', 'err,spa,xhr,stn,ins');
  request.searchParams.set('be', '104');
  request.searchParams.set('fe', '1503');
  request.searchParams.set('dc', '1467');
  request.searchParams.set('fsh', '1');
  request.searchParams.set('fp', '416');
  request.searchParams.set('fcp', '416');
  request.searchParams.set('timestamp', (timeNow - (offset * 2)).toString());

  const response = await fetch(request.toString(), {
    method: 'POST',
    headers,
    referrer: "https://staging-one.newrelic.com/",
    body: JSON.stringify({ ja: { 'enduser.id': enduserId } })
  });
  if (!response.ok) console.log('harvest failed', response.status, response.statusText);
  else {
    payloadMetadata.payloadsSentInJob++
  }

  return response
}