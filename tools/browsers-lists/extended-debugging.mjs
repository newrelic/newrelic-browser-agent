import browsersAll from './browsers-all.json' assert { type: 'json' }

export default function browserSupportsExtendedDebugging ({ browserName, browserVersion, version }) {
  if (!['chrome', 'firefox'].includes(browserName)) {
    return false
  }

  if (browserVersion === 'latest') {
    return true
  }

  if (browserName === 'firefox') {
    return Number(browserVersion) >= 53 || Number(version) >= 53
  }

  const latestChrome = browsersAll.chrome
    .reduce((aggregator, sauceBrowser) => aggregator = Math.max(Number(sauceBrowser.version), Number(sauceBrowser.browserVersion), aggregator), 0)
  return (Number(browserVersion) || Number(version)) >= latestChrome - 2
}
