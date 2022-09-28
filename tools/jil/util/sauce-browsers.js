const fs = require('fs')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

(async function () {
    console.log("contacting saucelabs API ...")
    const r = await fetch("https://api.us-west-1.saucelabs.com/rest/v1/info/platforms/all", {
        headers: {
            "Content-Type": "application/json"
        }
    })
    const json = await r.json()
    console.log("Browser Types Found:", json.reduce((prev, next) => prev.add(next.api_name), new Set()))
    console.log(`fetched ${json.length} browsers from saucelabs`)
    fs.writeFileSync('./tools/jil/util/browsers-supported.json', JSON.stringify(getBrowsers(json)))
    console.log(`saved saucelabs browsers to browsers-supported.json`)
    console.log(`-----------------------------------------------`)
    console.log(`-----------------------------------------------`)
    console.log('\x1b[43m%s\x1b[0m', 'If browsers-supported.json has updated, please make another commit.');  //yellow

})()

const browsers = {
    chrome: [],
    edge: [],
    safari: [],
    firefox: [],
    // android: [], // no longer works with W3C commands.... need to change JIL or do deeper dive to get this to work
    ios: []
    // ie: [] // no longer supported
}

const browserName = name => {
    switch (name) {
        case "edge":
            return "MicrosoftEdge"
        case "ie":
            return "internet explorer"
        case "ios":
            return 'iphone'
        default:
            return name
    }
}

const browserLength = name => {
    // takes half of this in the end
    switch (name) {
        case "ios":
        case "iphone":
        case "ipad":
        case "android":
        case "safari":
            return 5
        default:
            return 10
    }
}

const minVersion = name => {
    switch (name) {
        case "internet explorer":
            return 11
        case "chrome":
            return 64
        case "firefox":
            return 68
        case 'edge':
        case "MicrosoftEdge":
            return 80
        case "safari":
        case 'ios':
        case 'iphone':
            return 12
    }
}

function getBrowsers(sauceBrowsers) {
    Object.keys(browsers).forEach(browser => {
        const name = browserName(browser)
        const matches = sauceBrowsers.filter(sb => (sb.api_name === name || sb.os === name) && !isNaN(Number(sb.short_version)))
        matches.sort((a, b) => Number(b.short_version) - Number(a.short_version))
        const latest = getLatestOfArr(matches, browserLength(name))
        const dist = ['safari','ios'].includes(browser) ? latest : getDistributionOfArr(
            latest,
            Math.round(latest.length / 2)
        )
        dist.forEach(b => {
            const metadata = {
                browserName: mBrowserName(b),
                platform: mPlatformName(b),
                ...(!['safari', 'firefox'].includes(b.api_name) && { platformName: mPlatformName(b) }),
                version: b.short_version,
                ...(b.automation_backend !== 'appium' && !['safari', 'firefox'].includes(b.api_name) && { browserVersion: b.short_version }),
                ...(b.device && { device: b.device }),
                ...(b.automation_backend === 'appium' && { ["appium:deviceName"]: b.long_name }),
                ...(b.automation_backend === 'appium' && { ["appium:platformVersion"]: b.short_version }),
                ...(b.automation_backend === 'appium' && { ["appium:automationName"]: b.api_name === 'android' ? 'UiAutomator2' : 'XCUITest' }),
                ...(b.automation_backend === 'appium' && {
                    ["sauce:options"]: {
                        appiumVersion: b.recommended_backend_version
                    }
                })
            }
            if (metadata.browserName.toLowerCase() === 'safari') metadata.acceptInsecureCerts = false
            browsers[browser].push(metadata)
        })
    })
    return browsers
}

function getLatestOfArr(arr, remaining = 0, out = []) {
    if (remaining <= 0 || !arr.length) return out
    const latest = arr.shift()
    if (latest.short_version < minVersion(latest.api_name)) return out
    if (['iphone', 'ipad', 'android'].includes(latest.api_name) && latest.automation_backend !== 'appium') return getLatestOfArr(arr, remaining, out)
    if (['firefox'].includes(latest.api_name) && latest.os !== 'Windows 10') return getLatestOfArr(arr, remaining, out)
    if (!out.find(x => x.short_version === latest.short_version)) {
        out.push(latest)
        remaining--
    }
    return getLatestOfArr(arr, remaining, out)
}

function getDistributionOfArr(arr, n = 5) {
    if (arr.length < 2) return arr
    n = n < arr.length ? n : arr.length
    var elements = [arr[0]];
    var totalItems = arr.length - 2;
    var interval = Math.floor(totalItems / (n - 2));
    for (var i = 1; i < n - 1; i++) {
        elements.push(arr[i * interval]);
    }
    elements.push(arr[arr.length - 1]);
    return elements;
}

function mBrowserName(b) {
    switch (b.api_name) {
        case 'iphone':
        case 'ipad':
            return 'Safari'
        case 'android':
            return 'Chrome'
        default:
            return b.api_name
    }
}

function mPlatformName(b) {
    switch (b.api_name) {
        case 'iphone':
        case 'ipad':
            return 'iOS'
        case 'safari':
            // return b.os.replace('Mac', 'macOS')
            return b.os
        case 'android':
            return 'Android'
        default:
            return b.os
    }
}