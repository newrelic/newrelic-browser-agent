module.exports = {fail, getTime, checkPayload};

function fail(t) {
	return (err) => {
    t.error(err);
    t.end();
	}
}

function getTime (cm) {
  try {
    return cm[0].metrics.time.t
  } catch (e) {
    console.error(e)
    return 0
  }
}

/** Accepts an object payload, fails test if stringified payload contains data that should be obfuscated. */
function checkPayload(t, payload, name) {
  t.ok(payload, `${name} payload exists`)

  var strPayload = JSON.stringify(payload)
  //var failed = strPayload.includes('bam-test') || strPayload.includes('fakeid') || strPayload.includes('pii')

  t.ok(!strPayload.includes('pii'), `${name} -- pii was obfuscated`)
  t.ok(!strPayload.includes('bam-test'), `${name} -- bam-test was obfuscated`)
  t.ok(!strPayload.includes('fakeid'), `${name} -- fakeid was obfuscated`)
}