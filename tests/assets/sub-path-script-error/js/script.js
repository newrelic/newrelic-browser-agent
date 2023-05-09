function run () {
  fetch('http://test/json/foo')
    .catch(e => {
      newrelic.noticeError(e)
      console.error(e)
    })
}

run()
