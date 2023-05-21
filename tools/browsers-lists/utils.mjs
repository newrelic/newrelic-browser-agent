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
  if (capabilities.platformName?.toLowerCase() === 'ios') {
    return capabilities['appium:platformVersion']
  }

  return capabilities.browserVersion || capabilities.version
}
