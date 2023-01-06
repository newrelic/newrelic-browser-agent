# Browser Agent Integration Testing

The browser agent project contains a number of integration tests that use [WebDriver.io](https://webdriver.io/) to load test pages via the [testing-server](../testing-server). Below are instructions on different methods of running these tests.

## Saucelabs

Saucelabs is our default integration testing service. Given no arguments, running the test cases will attempt to connect to Saucelabs. The tests will assume you already have a [SauceConnect](https://docs.saucelabs.com/secure-connections/sauce-connect/) tunnel. Before starting, make sure you have two environment variables configured on your machine.

```
JIL_SAUCE_LABS_USERNAME:<sauce labs user name>
JIL_SAUCE_LABS_ACCESS_KEY:<sauce labs access key>
```

You can run `npm run sauce:connect` to start a SauceConnect tunnel. This is recommended when you will be running tests many times. It will help speed up your test runs.

To run all the tests, run `npm run wdio`. If you would like the testing to start and manage a SauceConnect tunnel, run `npm run wdio -- -s`.

## Selenium

You can also start and use a local or remote selenium service to execute the tests against. Below is an example using Docker to start a local Chrome selenium service and run the test cases.

```
docker run -d -p 4444:4444 -p 7900:7900 --shm-size="4g" --add-host=bam-test-1.nr-local.net:host-gateway selenium/standalone-chrome:latest
npm run wdio -- --selenium
```
