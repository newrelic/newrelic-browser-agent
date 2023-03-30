[![Community Plus header](https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# New Relic Browser Agent

The New Relic browser agent instruments your web application or site and provides observability into performance, errors, and other behaviors.

- The instructions on this page pertain to installing the browser agent as an NPM package (currently in pre-release).

- The browser agent is also generally available as a copy-paste JavaScript snippet and via auto-injection by backend apps. See *[Install the browser agent](https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/)* for info on these alternatives.

- For questions and feedback on this pre-release package, please visit the [Explorer's Hub](https://forum.newrelic.com/s/), New Relic's community support forum.

- Looking to contribute to the browser agent code base? See [DEVELOPING.md](DEVELOPING.md) for instructions on building and testing the browser agent library, and [CONTRIBUTING.md](CONTRIBUTING.md) for general guidance.

## Adding the agent package to your project

To make the agent available to your application, install via [NPM](https://docs.npmjs.com/cli/v8/commands/npm-install) or [Yarn](https://classic.yarnpkg.com/lang/en/docs/cli/install/).

```shell
$ npm install @newrelic/browser-agent --save
```

```shell
$ yarn add @newrelic/browser-agent
```

## Creating an app in New Relic One

Before instrumenting your app using the NPM package, a Browser App should be configured in New Relic One. This may be done with or without a corresponding APM agent. Once the app has been created, the Copy/Paste JavaScript code on the app's *Application settings* page will contain the configuration values needed to define options when instantiating the agent via the NPM package.

1. If a browser app does not already exist, create one:
   - From the *New Relic One* navigation panel, click *Add Data*.
   - Select the *Browser monitoring* data source.
   - Choose the *APM* or *Copy/Paste* method.
   - Select or name your app and click *Enable*.
2. From the navigation panel, select *Browser* to view brower apps.
3. Select the desired app and navigate to the *Application settings* page.
4. From the *Copy/Paste JavaScript* box, copy the configuration values assigned to the `NREUM` object (`init`, `info`, and `loader_config`). You will use these configuration values when instantiating the agent using the NPM package.

## Instantiating the agent

For best results, import and instantiate the `BrowserAgent` class as close to the top of the `head` element of your app's HTML output as possible. The specific location and method will vary based on your application's architecture or framework.

Populate the `options` parameter using configuration values found in the the *Copy/Paste JavaScript* box in your browser app's *Application settings* page in New Relic One.

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
- `jserrors`
- `metrics`
- `page_action`
- `page_view_timing`
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

## License

The Browser agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The Browser agent also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the [third-party notices document](THIRD_PARTY_NOTICES.md).