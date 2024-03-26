export function getBrowserName ({ browserName, platformName }) {
  if (platformName?.toLowerCase() === 'ios') {
    return 'ios'
  }
  if (platformName?.toLowerCase() === 'android') {
    return 'android'
  }
  if (browserName.toLowerCase() === 'internet explorer') {
    return 'ie'
  }
  if (browserName.toLowerCase() === 'microsoftedge') {
    return 'edge'
  }

  return browserName.toLowerCase()
}

export function getBrowserVersion (capabilities) {
  if (['ios', 'android'].includes(capabilities.platformName?.toLowerCase())) {
    return capabilities['appium:platformVersion'] || capabilities.version
  }

  return capabilities.browserVersion || capabilities.version
}
