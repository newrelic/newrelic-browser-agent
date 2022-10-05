[![Community Plus header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# New Relic Browser agent

The New Relic Browser agent instruments your website and provides observability into the performance and behavior of your application.

## Installing and using the Browser agent

To get started using the Browser agent in your own code, our Docs site is the best place to look:
* [Installing the Browser agent](https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/)
* [Troubleshooting Browser agent installation](https://docs.newrelic.com/docs/browser/browser-monitoring/troubleshooting/troubleshoot-your-browser-monitoring-installation/)
* [Introduction to browser monitoring](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/introduction-browser-monitoring/)
* [Browser monitoring best practices](https://docs.newrelic.com/docs/new-relic-solutions/best-practices-guides/full-stack-observability/browser-monitoring-best-practices-guide/)

## Building

We use webpack to automate builds of the agent. To build:

```bash
npm ci
npm run cdn:build:local
```

Build artifacts are placed in the `/build` directory.

To automatically rebuild the agent on each change:

```bash
npm run cdn:watch
```

## Running the agent locally
The Browser agent is loaded onto a web page in two parts. To install a version of the agent build locally:

* Host the assets generated in the `/build` directory via a local HTTP server (see instructions above to build the agent).
* Insert the script below into the top of the `<head>` tag of your webpage.

```html
<!-- Browser agent configuration -->
<script type="text/javascript">
   window.NREUM||(NREUM={});
   NREUM.info={
     "licenseKey":"example",
     "applicationID": 123,
     "agent": "http://localhost:8080/nr-spa.js"
   };
</script>
<!-- Browser agent loader script -->
<script src="http://localhost:8080/nr-loader-spa.js"></script>
```

NOTE: Your browser might cache JS scripts, which means you may not see your changes when the agent files are re-built. To turn off caching in Chrome, open DevTools and check the [Disable cache](https://developer.chrome.com/docs/devtools/network/reference/#disable-cache) checkbox.

## Configure the agent
The Browser agent uses a JSON configuration to set license key, application ID and which agent type to use.

### Set application ID and license key

You can find the `licenseKey` and `applicationID` in the New Relic UI's Browser Application **Settings** page ([one.newrelic.com](https://one.newrelic.com) > Browser > (select an app) > Settings > Application settings.)

![settings](https://user-images.githubusercontent.com/4779220/114478763-e5b18600-9bb3-11eb-98a1-7e4c2221eec4.jpg)

### Set agent type
Pick an agent type and update the following files from the table below:
* The file loaded as the _Browser agent loader script_ from the HTML above using **loader filename**
* The file loaded under `NREUM.info.agent` in _Browser agent configuration_ from the HTML above using **agent filename**.

| Agent type | loader filename   |
|------------|-------------------|
| Lite       | nr-loader-rum.js  |
| Pro        | nr-loader-full.js |
| Pro + SPA  | nr-loader-spa.js  |


## Testing
See the sections below for details about local and PR testing.

### Installing
The Browser agent uses a tool called the JavaScript Integration test Loader (`jil`) to run
tests (located in `/tools/jil`).

_Before running tests locally, be sure to [install and build](#building) from the root directory to ensure all dependencies are loaded and the application is properly built._

### Running the test suite
To run all applicable tests against [PhantomJS](http://phantomjs.org/), just type the following command with no additional arguments:

```
npm run test
```

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
either run `npm run build` after each change, or use `npm run watch` to automatically rebuild on each change.
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
| Agent type | querystring name |
| -----------| ---------------- |
| Lite       | rum              |
| Pro        | full             |
| Pro + SPA  | spa              |


Open a PR to run your tests on browsers other than PhantomJS.

### PR Testing

When you open a PR, the agent's functional and unit test suite will be run on the latest version of Chrome, Firefox and Safari to quickly validate the new code. If that passes, the PR will run functional and unit tests again against the full matrix of browsers and browser versions that are required to pass before approving a PR.

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

https://discuss.newrelic.com/c/full-stack-observability/browser

## Contribute

We encourage your contributions to improve the Browser agent! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

For more details on how best to contribute, see [CONTRIBUTING.md](CONTRIBUTING.md)

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/newrelic/newrelic-browser-agent/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you!  Without your contribution, this project would not be what it is today.  We also host [a community project page dedicated to the Browser agent](https://opensource.newrelic.com/projects/newrelic/newrelic-browser-agent).

## License
The Browser agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The Browser agent also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the [third-party notices document](THIRD_PARTY_NOTICES.md).
