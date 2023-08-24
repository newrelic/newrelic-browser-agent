jest.enableAutomock()
jest.unmock('./deny-list')

let denyListModule

beforeEach(async () => {
  denyListModule = await import('./deny-list')
})

afterEach(() => {
  jest.resetModules()
})

test('domain-only blocks all subdomains and all paths', () => {
  denyListModule.setDenyList(['foo.com'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a/b' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'www.foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.b.foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.b.foo.com', pathname: '/c/d' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'oo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.com', pathname: '/' })).toBeTruthy()
})

test('subdomain blocks further subdomains, but not parent domain', () => {
  denyListModule.setDenyList(['bar.foo.com'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.foo.com', pathname: '/a' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.foo.com', pathname: '/a/b' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'a.bar.foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.bar.foo.com', pathname: '/a' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.bar.foo.com', pathname: '/a/b' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a/b' })).toBeTruthy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'oo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.com', pathname: '/' })).toBeTruthy()
})

test('* blocks all domains', () => {
  denyListModule.setDenyList(['*'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'www.foo.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.com', pathname: '/' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'www.bar.com', pathname: '/' })).toBeFalsy()
})

test('respects path', () => {
  denyListModule.setDenyList(['bam.nr-data.net/somepath'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '/somepath' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'https', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '/someotherpath' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '/some/otherpath' })).toBeTruthy()
})

test('ignores port', () => {
  denyListModule.setDenyList(['bam.nr-data.net:1234'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '', port: '4321' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'http', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '' })).toBeTruthy()
})

test('ignores protocol', () => {
  denyListModule.setDenyList(['http://bam.nr-data.net'])

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', pathname: '', protocol: 'https' })).toBeFalsy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.net', port: '7890', protocol: 'https', host: 'bam.nr-data.net:7890', pathname: '/somepath' })).toBeFalsy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'bam.nr-data.com', pathname: '', protocol: 'http' })).toBeTruthy()
})

test.each([
  null,
  undefined,
  '!@$%^*',
  'https://example.com/http://foo.bar/'
])('ignores invalid deny list value %s', (denyListValue) => {
  denyListModule.setDenyList([denyListValue])

  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'foo.com', pathname: '/a/b' })).toBeTruthy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'www.foo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.b.foo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'a.b.foo.com', pathname: '/c/d' })).toBeTruthy()

  expect(denyListModule.shouldCollectEvent({ hostname: 'oo.com', pathname: '/' })).toBeTruthy()
  expect(denyListModule.shouldCollectEvent({ hostname: 'bar.com', pathname: '/' })).toBeTruthy()
})
