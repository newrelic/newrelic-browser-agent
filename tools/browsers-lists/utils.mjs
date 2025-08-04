// syncronously generate the list of supported mobile browsers for the test run
const user = process.env.LT_USERNAME || process.env.LAMBDA_USERNAME
const key = process.env.LT_ACCESS_KEY || process.env.LAMBDA_ACCESS_KEY
const mobileDevices = await fetch('https://mobile-api.lambdatest.com/mobile-automation/api/v1/list?region=us', {
  method: 'GET',
  headers: {
    Authorization: 'Basic ' + btoa(`${user}:${key}`)
  }
})
const mobileDevicesList = await mobileDevices.json()

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

/**
 * Ensures that the device name is running on the correct platform and version. This only works for iOS and Android devices. Otherwise the default device name is returned (undefined)
 * @param {*} capabilities
 * @returns
 */
export function getDeviceName (capabilities) {
  const { platformName, version } = capabilities
  let deviceName = capabilities.device_name || capabilities['LT:Options']?.deviceName
  if (platformName.toLowerCase() === 'ios' || platformName.toLowerCase() === 'android') {
    const match = mobileDevicesList.find(device => {
      return device.platformName.toLowerCase() === platformName.toLowerCase() &&
      Number(device.platformVersion) === Number(version)
    })
    if (match?.deviceName) return match.deviceName
  }

  return deviceName
}
