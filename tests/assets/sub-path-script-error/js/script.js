function run () {
  fetch('http://test/json/foo')
    .catch(e => {
      console.error(e)
      newrelic.noticeError(e)
    })
}

run()
