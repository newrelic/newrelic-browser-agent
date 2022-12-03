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
    fs.writeFileSync('./tools/jil/util/browsers-supported.json', JSON.stringify(getBrowsers(json), null, 2))
    console.log(`saved saucelabs browsers to browsers-supported.json`)

})()

const browsers = {
    chrome: [],
    edge: [],
    safari: [],
    firefox: [],
    // android: [], // no longer works with W3C commands.... need to change JIL or do deeper dive to get this to work
    ios: []
    // ie: [] // no longer supported for current-versions testing v1220+ - Oct '22
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

const numOfLatestVersionsSupported = name => {
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
const maxVersion = name => {
    switch (name) {
        case 'ios':
        case 'iphone':      // Sauce only uses Appium 2.0 for ios16 which requires W3C that we don't comply with yet
            return 15.9     // TO DO: this can be removed once that work is incorporated into JIL
        default:
            return 9999
    }
}

function getBrowsers(sauceBrowsers) {
    Object.keys(browsers).forEach(browser => {
        const name = browserName(browser)
        const versListForBrowser = sauceBrowsers.filter(platformSelector(name, minVersion(name), maxVersion(name)));
        versListForBrowser.sort((a, b) => Number(a.short_version) - Number(b.short_version));   // in ascending version order

        let latest = [], lastXVersions = numOfLatestVersionsSupported(name), versionsSeen = new Set();
        while (versListForBrowser.length && lastXVersions) {    // grab the last X (10) versions to test, removing duplicates
            let nextLatest = versListForBrowser.pop();
            if (versionsSeen.has(nextLatest.short_version))
                continue;
            latest.push(nextLatest);
            versionsSeen.add(nextLatest.short_version);
            lastXVersions--;
        }
        if (numOfLatestVersionsSupported(name) == 10)   // in all cases, we only test 5 versions, so trim the array
            latest = getDistributionOfArr(latest, Math.round(latest.length / 2));   // just pick every other version from the list

        latest.forEach(b => {
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

function platformSelector(desiredBrowser, minBrowserShortVers = 0, maxBrowserShortVers = 9999) {
    return (sb) => {
        if (sb.api_name !== desiredBrowser) return false;
        if (isNaN(Number(sb.short_version))) return false;
        if (sb.short_version < minBrowserShortVers) return false;
        if (sb.short_version > maxBrowserShortVers) return false;

        switch (desiredBrowser) {
            case 'iphone':
            case 'ipad':
            case 'android':
                if (sb.automation_backend !== 'appium') return false;
                break;
            // NOTE: the following platform limitation per browser is FRAGILE -- will have to update this in the future!
            case 'firefox':
                if (sb.os !== 'Windows 10') return false;   // we're only testing FF on Win10
                break;
            case 'MicrosoftEdge':
            case 'chrome':
                if (!sb.os.startsWith('Windows 1')) return false;    // exclude Linux, Mac, and pre-Win10
                break;
            // 'safari' will only ever be on MacOS
            case 'safari':
                if (sb.short_version == 12 && sb.os == 'Mac 10.13') return false;   // this OS+safari combo has issues with functional/XHR tests
                break;
        }
        return true;
    }
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
