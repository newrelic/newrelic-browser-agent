describe('Setting deny list', () => {
  let DlMod
  beforeEach(() => {
    jest.isolateModules(() => import('./deny-list.js').then(m => DlMod = m)) // give every test its own denyList (sandbox)
  })

  it('respects path', () => {
    DlMod.setDenyList(['bam.nr-data.net/somepath'])

    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '/somepath' })).toBeFalsy() // shouldCollectEvent returns 'false' when there IS a match...
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'https', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '' })).toBeTruthy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '/someotherpath' })).toBeTruthy()
  })

  it('ignores port', () => {
    DlMod.setDenyList(['bam.nr-data.net:1234'])

    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '', port: '4321' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'http', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '' })).toBeTruthy()
  })

  it('ignores protocol', () => {
    DlMod.setDenyList(['http://bam.nr-data.net'])

    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '', protocol: 'https' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'https', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()
    expect(DlMod.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '', protocol: 'http' })).toBeTruthy()
  })
})
