describe('Setting deny list', () => {
  let DlMod
  beforeEach(() => {
    jest.isolateModules(() => import('./deny-list.js').then(m => DlMod = m)) // give every test its own denyList (sandbox)
  })

  it('ignores port (uses hostname, not host)', () => {
    DlMod.setDenyList(['bam.nr-data.net:1234'])

    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '/somepath' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'http', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '' })).toBeTruthy()
  })
})
