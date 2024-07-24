<a href="https://opensource.newrelic.com/oss-category/#community-plus"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/dark/Community_Plus.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"><img alt="New Relic Open Source community plus project banner." src="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"></picture></a>

# New Relic Browser Agent

The New Relic browser agent instruments your web application or site and provides observability into performance, errors, and other behaviors.

- The instructions on this page pertain to installing the browser agent as an NPM package.

- The browser agent is also generally available as a copy-paste JavaScript snippet and via auto-injection by backend apps. See *[Install the browser agent](https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/)* for info on these alternatives. Releases are deployed to customers gradually, so the version available via these other methods often lags the current release of this package.

- For questions and feedback on this package, please visit the [Explorer's Hub](https://forum.newrelic.com/s/), New Relic's community support forum.

- Looking to contribute to the browser agent code base? See [DEVELOPING.md](DEVELOPING.md) for instructions on building and testing the browser agent library, and [CONTRIBUTING.md](CONTRIBUTING.md) for general guidance.

## Adding the agent package to your project

To make the agent available to your application, install via [NPM](https://docs.npmjs.com/cli/v8/commands/npm-install) or [Yarn](https://classic.yarnpkg.com/lang/en/docs/cli/install/).

```shell
$ npm install @newrelic/browser-agent --save
```

```shell
$ yarn add @newrelic/browser-agent
```

## Creating an app in New Relic

Before instrumenting your app using the NPM package, a Browser App should be configured in New Relic. This may be done with or without a corresponding APM agent. Once the app has been created, the Copy/Paste JavaScript code on the app's *Application settings* page will contain the configuration values needed to define options when instantiating the agent via the NPM package.

1. If a browser app does not already exist, create one:
   - From the *New Relic* navigation panel, click *Add Data*.
   - Select the *Browser monitoring* data source.
   - Choose the *APM* or *Copy/Paste* method.
   - Select or name your app and click *Enable*.
2. From the navigation panel, select *Browser* to view browser apps.
3. Select the desired app and navigate to the *Application settings* page.
4. From the *Copy/Paste JavaScript* box, copy the configuration values assigned to the `NREUM` object (`init`, `info`, and `loader_config`). You will use these configuration values when instantiating the agent using the NPM package.

## Instantiating the agent

For best results, import and instantiate the `BrowserAgent` class as close to the top of the `head` element of your app's HTML output as possible. The specific location and method will vary based on your application's architecture or framework. See [Library Support](#library-support) for more information.

Populate the `options` parameter using configuration values found in the the *Copy/Paste JavaScript* box in your browser app's *Application settings* page in New Relic.

```javascript
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

// Populate using values in copy-paste JavaScript snippet.
const options = {
  init: { ... }, // NREUM.init
  info: { ... }, // NREUM.info
  loader_config: { ...} // NREUM.loader_config
}

// The agent loader code executes immediately on instantiation.
new BrowserAgent(options)
```

## Turning off features at runtime

Features may be turned off at runtime, which may have a meaningful peformance impact in some cases.

In the example below, the `page_view_timing` and `session_trace` features are disabled.

```javascript
const options = {
  info: { ... },
  loader_config: { ... },
  init: {
    page_view_timing: { enabled: false },
    session_trace: { enabled: false },
    ...
  }
}
```

The following features may be disabled by adding `init` entries as shown above. Note that the `page_view_event` feature may not be disabled.

- `ajax`
- `generic_events`
- `jserrors`
- `metrics`
- `page_action`
- `page_view_timing`
- `session_replay`
- `session_trace`
- `spa`

See the [New Relic documentation site](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/introduction-browser-monitoring/) for information on the above features.


## Composing a custom agent with selected feature modules

The examples above use the `BrowserAgent` class, which is the best option for most use cases. The class makes all browser agent features available but provides the ability to turn off individual features selectively.

Using the base `Agent` class, it is also possible to compose a custom agent by passing an array called `features` in the `options` object, containing only the desired feature modules. Depending on which features are included, this may yield a smaller loader script and improved performance.

The example below includes three feature modules: `Metrics`, `PageViewEvent`, and `PageViewTiming`.

```javascript
import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'

const options = {
  info: { ... },
  loader_config: { ... },
  init: { ... }
}

new Agent({
  ...options,
  features: [
    Metrics,
    PageViewEvent,
    PageViewTiming
  ]
})
```

The following feature modules are available for inclusion in the `features` array:

```javascript
import { Ajax } from '@newrelic/browser-agent/features/ajax';
import { JSErrors } from '@newrelic/browser-agent/features/jserrors';
import { Metrics } from '@newrelic/browser-agent/features/metrics';
import { PageAction } from '@newrelic/browser-agent/features/page_action';
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event';
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing';
import { SessionTrace } from '@newrelic/browser-agent/features/session_trace';
import { Spa } from '@newrelic/browser-agent/features/spa';
```

## Deploying one or more "micro" agents per page

The examples above use the `Agent` class at their core, which is ideal for most cases as it will automatically detect page-level events across your web application.

Using the `MicroAgent` class, it is possible to skip the "auto" instrumentation phases of the other loader types, and provide a *very small* agent designed for capturing data in a controlled manner via the API interfaces. The `MicroAgent` captures a distinct `PageView` event when instantiated, and additional `PageAction` and `JavaScriptError` events may be captured by calling the `noticeError` and `addPageAction` methods.

Because it does not wrap the page-level globals in the same way as the base `Agent` class, the `MicroAgent` is not only smaller but can easily be instantiated multiple times on a single page with low overhead, with each instance configured to report to a different Browser App entity in New Relic if desired. This accommodates specialized use cases, such as segmented UI designs (e.g., the micro front-end pattern) or applications requiring subsets of manually-handled data to be reported to different application entities.

The example below illustrates how to instantiate and interact with two separate `MicroAgent` instances on one page.

```javascript
import { MicroAgent } from '@newrelic/browser-agent/loaders/micro-agent'

const options_1 = {
  info: { ... }, // configuration for application 1
  loader_config: { ... },
  init: { ... }
}

const microAgent1 = new MicroAgent(options_1)

const options_2 = {
  info: { ... }, // configuration for application 2
  loader_config: { ... },
  init: { ... }
}

const microAgent2 = new MicroAgent(options_2)

// manually handle a JavaScript Error with microAgent1
try{
  ...
} catch(err) {
  microAgent1.noticeError(err)
}

// manually capture a Page Action with microAgent2
microAgent2.addPageAction('myData', {hello: 'world'})
```

## Browser Agent APIs
All Browser Agent APIs are exposed for use in two ways:
- Via the `newrelic` window-level global object
- At the top-level of the Agent instance

Please see our [official documentation](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/using-browser-apis/) for more information about the Browser Agent APIs.

```js
  newrelic.noticeError(...)
  // or
  const NrAgent = new BrowserAgent(...)
  NrAgent.noticeError(...)
```

## Session Replay
The Session Replay feature is now available for limited free use by all customers. The data collected by this feature will become billable starting May 15th, 2024. Please see the [Session Replay documentation](https://docs.newrelic.com/docs/browser/browser-monitoring/browser-pro-features/session-replay/) to get started using this new feature.

## Supported browsers

Our supported browser list can be accessed [here](https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/#browser-types).

If you desire more control over how the agent is built, our package also includes the source code. The source code is written to target the latest ECMAScript standards (ES2022). Please note that if you import the browser agent source code instead of the transpiled distribution code, you may need to alter your project's build system to apply transformations to the browser agent source code. Without these transforms, the code produced by your project's build system may not be compatible with your desired target browsers. Below is an example of how to import the source code.

```javascript
// Note the /src/ in the import paths below
import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/src/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/src/features/page_view_timing'

const options = {
  info: { ... },
  loader_config: { ... },
  init: { ... }
}

new Agent({
  ...options,
  features: [
    Metrics,
    PageViewEvent,
    PageViewTiming
  ]
})
```

Neither the browser agent development team nor the New Relic support teams can support the numerous build systems that exist in the JavaScript ecosystem. If you run into issues, you may be asked to revert to importing from the transpiled distribution code.

**DON'T** mix imports between the browser agent source code and transpiled distribution code. The below will break.

```javascript
// THIS IS BAD - do not do this
import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
```

## Library Support

The browser agent is written to be agnostic to any JavaScript library or framework. The agent exposes a number of [API methods](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/using-browser-apis/) that can be incorporated into libraries and frameworks. For example, export or make available the initialized agent and create a new error boundary in your react application that calls `browserAgent.noticeError()`.

### Server-Side Rendering

A lot of new frameworks support the concept of server-side rendering the pages of an application to improve SEO and the performance of the user experience. The browser agent must be imported and instantiated within a browser context and will not work if executed on a server or in the server context of a server-side rendered application. These frameworks typically provide support for defining code that should only be run on the client. Check your frameworks documentation for more information.

## Disclaimers

The session replay library shipping as part of the browser agent is not turned on by default. For information on the use of this feature, see [Session Replay](#session-replay)

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

https://discuss.newrelic.com/c/full-stack-observability/browser

## Contribute

We encourage your contributions to improve the Browser agent! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

For more details on how best to contribute, see [CONTRIBUTING.md](CONTRIBUTING.md)

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/newrelic/newrelic-browser-agent/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [our bug bounty program](https://docs.newrelic.com/docs/security/security-privacy/information-security/report-security-vulnerabilities/).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you! Without your contribution, this project would not be what it is today. We also host [a community project page dedicated to the Browser agent](https://opensource.newrelic.com/projects/newrelic/newrelic-browser-agent).

## License

The Browser agent is licensed under the [Apache 2.0](https://apache.org/licenses/LICENSE-2.0.txt) License.

The Browser agent also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the [third-party notices document](THIRD_PARTY_NOTICES.md).
