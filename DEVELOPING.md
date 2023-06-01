<a href="https://opensource.newrelic.com/oss-category/#community-plus"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/dark/Community_Plus.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"><img alt="New Relic Open Source community plus project banner." src="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"></picture></a>

<div style="display:flex;flex-wrap:wrap;justify-content:space-evenly;align-items:top;margin:0 0 10px">
    <div style="margin:0 5px;"><img src="https://img.shields.io/github/actions/workflow/status/newrelic/newrelic-browser-agent/smoke-test.yml?branch=main&event=schedule&style=plastic&label=Smoke%20Tests" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/github/actions/workflow/status/newrelic/newrelic-browser-agent/tests-polyfill.yml?branch=main&event=schedule&style=plastic&label=Polyfills%20Tests" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/github/v/release/newrelic/newrelic-browser-agent?label=Current%20Release&style=plastic" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/github/commits-since/newrelic/newrelic-browser-agent/latest?style=plastic&label=Next Release - Merged&color=green" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/github/issues-pr/newrelic/newrelic-browser-agent/Next%20Release?color=orange&label=Next%20Release%20-%20In%20Progress&style=plastic" /></div>
</div>

<h3 style="text-align:center;border-top:1px solid grey;margin:0 0 5px;"><a href="https://one.newrelic.com">https://one.newrelic.com</a></h3>
<div style="display:flex;flex-wrap:wrap;justify-content:space-evenly;align-items:top;;margin:0 0 10px">
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fcurrent-version-production.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fupdate-version-production.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fcopy-paste-version-production.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fgeneric-deploy-percent-production.json" /></div>
</div>

<h3 style="text-align:center;border-top:1px solid grey;margin:0 0 5px;"><a href="https://one.eu.newrelic.com">https://one.eu.newrelic.com</a></h3>
<div style="display:flex;flex-wrap:wrap;justify-content:space-evenly;align-items:top;;margin:0 0 10px">
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fcurrent-version-eu.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fupdate-version-eu.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fcopy-paste-version-eu.json" /></div>
    <div style="margin:0 5px;"><img src="https://img.shields.io/endpoint?style=plastic&url=https%3A%2F%2Fnewrelic.github.io%2Fnewrelic-browser-agent-release%2Fbadges%2Fgeneric-deploy-percent-eu.json" /></div>
</div>

# New Relic Browser agent development

This page contains information about working on the New Relic Browser agent project in a local development environment. For info on implementing the Browser agent in your own application, see the resources below:

- [Installing the Browser agent](https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/)
- [Troubleshooting Browser agent installation](https://docs.newrelic.com/docs/browser/browser-monitoring/troubleshooting/troubleshoot-your-browser-monitoring-installation/)
- [Introduction to browser monitoring](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/introduction-browser-monitoring/)
- [Browser monitoring best practices](https://docs.newrelic.com/docs/new-relic-solutions/best-practices-guides/full-stack-observability/browser-monitoring-best-practices-guide/)
- [Browser agent NPM package](https://www.npmjs.com/package/@newrelic/browser-agent)

## Building

We use webpack to automate builds of the agent. To build:

```bash
npm ci
npm run cdn:build:local
```

Build artifacts are placed in the `/dist/cdn` directory.

To automatically rebuild the agent on each change:

```bash
npm run cdn:watch
```

## Running the agent locally

The Browser agent is loaded onto a web page in two parts. To install a version of the agent build locally:

- Host the assets generated in the `/dist/cdn` directory via a local HTTP server (see instructions above to build the agent).
- Insert the script below into the top of the `<head>` tag of your webpage.

```html
<!-- Browser agent configuration -->
<script type="text/javascript">
  window.NREUM || (NREUM = {});
  NREUM.info = {
    licenseKey: "example",
    applicationID: 123,
  };
</script>
<!-- Browser agent loader script -->
<script src="http://localhost:8080/nr-loader-spa.js"></script>
```

NOTE: Your browser might cache JS scripts, which means you may not see your changes when the agent files are re-built. To turn off caching in Chrome, open DevTools and check the [Disable cache](https://developer.chrome.com/docs/devtools/network/reference/#disable-cache) checkbox.

## Running a pre-configured server

The prebuilt test server can serve the locally built agent files as noted under _[Debugging Tests](#debugging-tests)_ below. To use this server, run the `npm run test-server` command.

## Configure the agent

The Browser agent uses a JSON configuration to set license key and application ID.

### Set application ID and license key

You can find the `licenseKey` and `applicationID` in the New Relic UI's Browser Application **Settings** page ([one.newrelic.com](https://one.newrelic.com) > Browser > (select an app) > Settings > Application settings.)

![settings](https://user-images.githubusercontent.com/4779220/114478763-e5b18600-9bb3-11eb-98a1-7e4c2221eec4.jpg)

### Set agent type

Pick an agent type and update the following files from the table below:

- The file loaded as the _Browser agent loader script_ from the HTML above using **loader filename**

| Agent type | loader filename       |
| ---------- | --------------------- |
| Lite       | nr-loader-rum.min.js  |
| Pro        | nr-loader-full.min.js |
| Pro + SPA  | nr-loader-spa.min.js  |

The agent loader will automatically import any necessary chunks of code later on the page after being successfully initialized wiht configurations.

## Testing

See the sections below for details about local and PR testing.

### Installing

The Browser agent uses a tool called the JavaScript Integration test Loader (`jil`) to run
tests (located in `/tools/jil`).

_Before running tests locally, be sure to [install and build](#building) from the root directory to ensure all dependencies are loaded and the application is properly built._

```
npm install
```

```
npm run build:all
```

### Running the test suite

To run all tests on a specific browser/platform, you can either run on Saucelabs or point the testing framework to your own Selenium server.

To run tests on Saucelabs, you will need your own Saucelabs account. Export your Saucelabs username and access key in these environment variables - JIL_SAUCE_LABS_USERNAME, JIL_SAUCE_LABS_ACCESS_KEY. After that you can use the following command to run tests on a specific browser. Note that the browser/platform needs to be defined in this [matrix file](tools/jil/util/browsers.json).

Here is an example of running all tests on the latest version of Chrome.

```
npm run test -- -s -b chrome@latest
```

Here is an example of using your own Selenium server:

```
npm run test -- -b chrome@latest --selenium-server=localhost:4444
```

### Supported Browsers

- The browser agent is tested against this [list of browsers and environments](./tools/jil/util/browsers-supported.json). Use of the browser agent with untested browsers may lead to unexpected results.

**Important Notes:**

- `jil` does not handle building the agent automatically;
  either run `npm run build:all` after each change, or use `npm run watch` to automatically rebuild on each change.
- To pass arguments to the testing suite using `npm run test` you must separate your arguments from the npm script using an empty `--` parameter as was exemplified above.

### Running a single test

To run a single test in isolation, pass the path to `jil`:

```
npm run test -- tests/functional/api.test.js
```

### Debugging tests

To debug a unit test (`/tests/browser`) or the asset under test in a unit or functional test (`/tests/assets`), run the command below:

```
npm run test-server
```

Running this command starts a server, available at http://localhost:3333, with a list of all available unit tests and test HTML pages with the Browser agent installed. Select a unit test from the list to run the test itself in your browser, or select an asset from the list to debug.

**Important**: When running `jil-server` be sure to tell HTML files which Browser agent type you want by adding a `?loader=spa` to the `querystring`. Here's an example:

```
http://localhost:3333/tests/assets/spa/fetch.html?loader=spa
```

| Agent type    | querystring name |
| ------------- | ---------------- |
| Lite          | rum              |
| Pro (default) | full             |
| Pro + SPA     | spa              |

### PR Testing

When you open a PR, the agent's functional and unit test suite will be run on the latest version of Chrome, Firefox and Safari to quickly validate the new code. If that passes, the PR will run functional and unit tests again against the full matrix of browsers and browser versions that are required to pass before approving a PR.
