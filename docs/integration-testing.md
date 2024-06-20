# Integration Testing

We utilize [WDIO](https://webdriver.io/) for the purposes of writing integration tests. Integration tests are meant to test a loaded and running agent within a webpage. Typically, we are testing certain user interactions or customer code execution patterns to see how the agent responds and what it reports to a mock BAM server. This documentation will go into details on how the team expects these tests to be written, best practices, and general DOs and DON'Ts.

**Note** the team is in the process of migrating our integration tests from an in-house tool called JIL to WDIO. This doc will cover WDIO only.

## Running Tests - LambdaTest

To run the integration tests with SauceLabs, you must have two environment variables set: `LT_USERNAME` and `LT_ACCESS_KEY`. You can find more information about these variables [here](https://www.lambdatest.com/support/docs/using-environment-variables-for-authentication-credentials/).

The integration tests will also need to be able to communicate to a mock BAM (data collection) server running on the local machine. This is accomplished with a UnderPass [tunnel](https://www.lambdatest.com/support/docs/underpass-tunnel-application/). The tunnel can be started separately from the integration tests allowing multiple test runs to use the same tunnel and speeding up the test execution.

To run all the integration tests against the latest version of Chrome in LambdaTest, execute `npm run wdio`. To run just a specific test, you can pass the path of the test file to the test command like so: `npm run wdio -- tests/specs/test.e2e.js`. Additional terminal options are listed below.

## WDIO CLI

The project wraps the WDIO execution in a custom CLI. When executing this project's WDIO, you are not running the CLI that ships with WDIO. The custom CLI arguments are defined [here](../tools/wdio/args.mjs). The custom CLI will take arguments, construct a WDIO configuration, and execute WDIO.

## Writing Tests

All tests should exist in the path `tests/specs` for WDIO to pick them up. Tests should be grouped by the functionality or scenario being tested. WDIO will launch a new browser for each file, execute all tests of that file in the browser, and close the browser. This means more files will launch more browsers, improving test isolation but also increasing the amount of time it takes to run the full test suite. Keep this in mind when writing integration tests.

- **DO** create a global `describe` wrapper to hold all the tests. The name of this wrapper will be used to name the test result in SauceLabs making it easier to review test failures.
- **DO** create a `describe` to group tests that have similar pre/post test instructions.
- **DON'T** save state between individual test cases.
- **DO** load a new page to start each test.
- **DO** use `beforeEach` to instantiate variables and state before each test.
- **DO** use `afterEach` to cleanup global state after each test.
- **DON'T** use `beforeAll` or `afterAll`, which can result in poor state isolation.
- **DO** use the `it` keyword to declare a test case that has no browser limitation.
- **DO** use the `withBrowsersMatching()` function to declare a test case that has browser limitations.
- **DO** avoid promise chaining and use `async/await` to test asynchronous code.
- **DO** create custom commands in `tools/wdio/plugins/jil-commands.mjs` instead of writing utility methods for common testing functionality.

### Tests for specific browsers

In some cases, a test may apply only to a subset of browsers. We have created a new global `withBrowsersMatching()` that can be used in place of `it`. The `withBrowsersMatching` method takes a browser matcher and returns a higher-order function. If the browser matcher matches the browser the test is currently running inside, the higher-order function will call the `it` global method to register the test case with the WDIO framework. Below is an example.

```javascript
import { notInternetExplorer } from '../../tools/browser-matcher/common-matchers.mjs'
...
withBrowsersMatching(notInternetExplorer)
  ('should load when sessionStorage is not available', async () => {
    ...
  })
```

Common browser matchers that are used for more than one test file can be created/located in `tools/browser-matcher/common-matchers.mjs`. If you have a test case that needs a very specific browser matcher, you can create the matcher within the test file itself like the below example.

```javascript
import SpecMatcher from '../../tools/browser-matcher/spec-matcher.mjs'

const notChromeOrSafari = new SpecMatcher()
  .exclude('chrome)
  .exclude('safari')
...
withBrowsersMatching(notInternetExplorer)
  ('should load when sessionStorage is not available', async () => {
    ...
  })
```

The `SpecMatcher` class employs the builder pattern allowing you to endlessly chain calls to the `exclude` and `include` methods. Each call will add a new rule internally that will be assessed when a test is ran that depends on the matcher. You may find that an existing matcher meets some of the needs for a new test but needs additional rules applied in your use case. If you find yourself in this situation, the `SpecMatcher` class has a `clone` method that you can use to start your new matcher with a base set of rules instead of an empty set. Be sure to use `clone` instead of importing and modifying an existing matcher as that will cause the matcher to unexpectedly mutate for other tests in the same file.

- **DO** create one-off matchers within the test file and move the matcher to `tools/browser-matcher/common-matchers.mjs` if it is used in more than one test file.
- **DON'T** modify an existing matcher unless the modification should apply to all current uses of the matcher. Instead, clone the matcher to start creating a new matcher.
