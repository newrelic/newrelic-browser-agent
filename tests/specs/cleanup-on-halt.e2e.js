import { testRumRequest } from '../../tools/testing-server/utils/expect-tests'

describe('Memory leaks', () => {
  it('does not occur on ee backlog when RUM flags are 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sr: 0, err: 0, ins: 0, spa: 0, loaded: 1 })
    })
    // This test relies on features to call deregisterDrain when not enabled by flags which in turn should clear their backlogs.

    await browser.url(await browser.testHandle.assetURL('obfuscate-pii.html')).then(() => browser.waitForAgentLoad())
    const backlog = await browser.execute(function () {
      const backlog = {}
      for (const key in newrelic.ee.backlog) {
        const array = newrelic.ee.backlog[key]
        backlog[key] = array === null ? 0 : array.length
      }
      return backlog
    })

    expect(backlog).toEqual(expect.objectContaining({
      ajax: 0, // ajax does not rely on any flags anyways so it's always drained
      jserrors: 0,
      metrics: 0,
      generic_events: 0,
      page_view_event: 0, // no handler
      page_view_timing: 0, // does not rely on any flags
      session_trace: 0,
      spa: 0
    }))
  })
})
