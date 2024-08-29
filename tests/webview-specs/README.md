# WebView Specs

These spec files are meant to be ran against a test mobile application containing a webview. The app used is owned by the mobile teams. Below are build instructions if we ever need to update the app in LambdaTest.

The apps are stored here under `assets` for posterity.

## Writing Tests

Tests wrote against a native app cannot use a lot of the custom commands and features we have built into WDIO. You will need to access the `driver` global directly and reference the [Appium documentation](https://webdriver.io/docs/api/appium).

You may also want to use the SauceLabs specific [Appium inspector app](https://github.com/appium/appium-inspector) to run the test app. This allows you to get information like selector strings for targeting elements.

## Building iOS Test App

- Clone the ios agent repository
- Switch to the branch needed if necessary
- Run `git submodule update --checkout --recursive` to pull latest submodules
- Open a terminal and CD into the project directory
- Run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` to ensure your local xcode tools are setup correctly
- Run `xcodebuild ARCHS=x86_64 clean build -workspace Agent.xcworkspace -scheme NRTestApp -derivedDataPath './nrba-build' -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 13 Pro Max,OS=15.5' -configuration Release CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO` to build the NRTestApp
  - You may need to install the 15.5 iOS sdk
- CD into `nrba-build/Build/Products/Release-iphonesimulator`
- Run `zip -r NRTestApp.zip NRTestApp.app`
- You can now open this directory in Finder and drag/drop the zip into the Real Time -> Virtual Mobile screen of LambdaTest

## Building Android App

- Use [SDKMAN](https://sdkman.io/) or some other means to install Java 11
- Clone `https://github.com/ndesai-newrelic/Android-WebView`
- Open the project in android studio
- Make sure you have API level 28 installed
- Create a new file called `local.properties` and add `sdk.dir=/Users/<username>/Library/Android/sdk` to it replacing `<username>` with your home directory name
- Open `java/com/webview/myapplication/MainActivity.java`
- Comment out the code requesting storage access permissions and the code supporting downloads from the webview.
- Open `settings.gradle` and change the app name to `nr-test-app`
- Open `app/src/main/res/values/strings.xml` and change the name of the app to `NRTestApp`
- Open the `build` menu and select build APKs
- Open finder to the location of the APK file and drag/drop the zip into the Real Time -> Virtual Mobile screen of LambdaTest

## Uploading App to LambdaTest

The webview apps we upload to lambdatest are automatically deleted by LT after 60 days and you have to re-upload the app.

1. Open https://app.lambdatest.com/console/realtime/app
1. Click the tab for the OS you want (iOS or Android)
1. Click the filter hamburger and select “Team”
1. Check if our app is present (won’t be after 60 days)
1. Click the upload button
1. Select the app you want to upload, they exist in the repo at tests/webview-specs/assets
1. Click the gear icon for the uploaded app and change the visibility to “Team”
1. Copy the new App Id and update tools/wdio/config/lambdatest.conf.mjs
