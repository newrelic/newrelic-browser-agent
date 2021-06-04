
JIL is a testing framework used to test the New Relic Javascript (Browser) agent.

It is based on the following technologies:

* tape
* SauceLabs
* PhantomJS

Please see the [Browser Agent README](https://github.com/newrelic/newrelic-browser-agent/blob/main/README.md#testing) for more information on using JIL for local testing.

# Run tests in headless Chrome

Start docker container

```
docker run -d -p 4444:4444 -p 7900:7900 selenium/standalone-chrome
```

Documented here
https://github.com/SeleniumHQ/docker-selenium#quick-start

Example command to run tests:

```
node tools/jil/bin/cli.js -b chrome@latest/linux --selenium-server=localhost:4444 -H host.docker.internal tests/browser/api.browser.js
```
