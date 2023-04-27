# Integration Testing

We utilize [WDIO](https://webdriver.io/) for the purposes of writing integration tests. Integration tests are meant to test a loaded and running agent within a webpage. Typically, we are testing certain user interactions or customer code execution patterns to see how the agent responds and what it reports to a mock BAM server. This documentation will go into details on how the team expects these tests to be written, best practices, and general DOs and DON'Ts.

**Note** the team is in the process of migrating our integration tests from an in-house tool called JIL to WDIO. This doc will cover WDIO only.

## Running Tests - SauceLabs

To run the integration tests with SauceLabs, you must have two environment variables set: `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY`. You can find more information about these variables [here](https://docs.saucelabs.com/basics/environment-variables/).

The integration tests will also need to be able to communicate to a mock BAM server running on the local machine. This is accomplished with a SauceLabs [tunnel](https://docs.saucelabs.com/secure-connections/sauce-connect/setup-configuration/basic-setup/). The tunnel can be started separately from the integration tests allowing multiple test runs to use the same tunnel and speeding up the test execution. To start the tunnel from the project, make sure all the project dependencies are installed and execute `npm run sauce:connect`.

To run all the integration tests against the latest version of Chrome in SauceLabs, execute `npm run wdio`. To run just a specific test, you can pass the path of the test file to the test command like so: `npm run wdio -- tests/specs/test.e2e.js`. Additional terminal options are listed below.

## Running Tests - Selenium

For contributors that do not have access to the teams SauceLab account, you can execute the integration tests against a local standalone instance of Selenium or a Selenium Grid you have access to. The below instructions will cover a just a local Selenium instance using Docker. This will require that you have Docker installed and can get access to the Docker Hub for community images.

To get started, execute one of the below commands to get a Selenium instance running. Be sure to use the command that matches your local CPU architecture. The x86 images will not work on a Mac with an ARM processor.

```bash
# Mac Silicon (ARM) - Chrome
docker run -d -it -p 4444:4444 -p 7900:7900 --shm-size 2g --add-host=bam-test-1.nr-local.net:host-gateway seleniarm/standalone-chromium:latest
# Mac Silicon (ARM) - Firefox
docker run -d -it -p 4444:4444 -p 7900:7900 --shm-size 2g --add-host=bam-test-1.nr-local.net:host-gateway seleniarm/standalone-firefox:latest

# Intel Silicon (x86) - Chrome
docker run -d -it -p 4444:4444 -p 7900:7900 --shm-size 2g --add-host=bam-test-1.nr-local.net:host-gateway selenium/standalone-chromium:latest
# Intel Silicon (x86) - Firefox
docker run -d -it -p 4444:4444 -p 7900:7900 --shm-size 2g --add-host=bam-test-1.nr-local.net:host-gateway selenium/standalone-firefox:latest
```

**Links**: [x86](https://github.com/SeleniumHQ/docker-selenium) || [ARM](https://github.com/seleniumhq-community/docker-seleniarm)

Once the local Selenium instance is running, you can execute `npm run wdio -- --selenium -b 'chrome'` or `npm run wdio -- --selenium -b 'firefox'` to start running the tests. If you would like to watch the browser as the tests execute, access the Selenium VNC server [here](http://localhost:7900/?autoconnect=1&resize=scale&password=secret).

To run the tests against a remote Selenium instance, such as a Selenium Grid service, use the `--selenium-host <host>` and `--selenium-port <port>` arguments.

## WDIO CLI

The project wraps the WDIO execution in a custom CLI. When executing WDIO, you are not running the CLI that ships with WDIO. The customer CLI arguments are defined [here](../tools/wdio/args.mjs). The custom CLI will take arguments, construct a WDIO configuration, and execute WDIO.

## Writing Tests

All tests should exist in the path `tests/specs` for WDIO to pick them up. Tests should be grouped by the functionality being tested or scenario being ran. WDIO will launch a new browser for each file, execute all tests of that file in the browser, and close the browser. This means more files will launch more browsers improving test isolation but also increasing the amount of time it takes to run the full test suite. Keep this in mind when writing integration tests.

- **DO** create a global `describe` wrapper to hold all the tests. The name of this wrapper will be used to name the test result in SauceLabs making it easier to review test failures.
- **DO** create a `describe` to group tests that have similar pre/post test instructions.
- **DON'T** save state between individual test cases.
- **DO** load a new page to start each test.
- **DO** use `beforeEach` to instantiate variables and state before each test.
- **DO** use `afterEach` to cleanup global state after each test.
- **DON'T** use `beforeAll` or `afterAll`.
- **DO** use the `it` keyword to declare a test case that has no browser limitation.
- **DO** use the `test()` function to declare a test case that has browser limitations.
- **DO** avoid promise chaining and use `async/await` to test asynchronous code.
- **DO** create custom commands in `tools/wdio/plugins/jil-commands.mjs` instead of writing utility methods for common testing functionality.

### Tests for specific browsers

In some cases, a test may only apply to or not work expectedly in certain browser. We have created a new global `test()` that can be used in place of `it`. The `test` method takes a browser matcher and returns a higher-order function. If the browser matcher matches the browser the test is currently running inside, the higher-order function will call the `it` global method to register the test case with the WDIO framework. Below is an example.

```javascript
import Matcher from '../../tools/jil/util/browser-matcher'
...
test(Matcher.withFeature('notInternetExplorer'))
  ('should load when sessionStorage is not available', async () => {
    ...
  })
```
