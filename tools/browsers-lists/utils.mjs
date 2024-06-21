export function getBrowserName (capabilities) {
  let { browserName, platformName } = capabilities
  if (!platformName) platformName = capabilities['LT:Options']?.platformName

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
  return capabilities.browserVersion || capabilities['LT:Options']?.platformVersion
}
