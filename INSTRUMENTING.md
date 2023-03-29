# Instrumenting a front-end web app using the browser-agent NPM package

> These instructions apply to a pre-release version of the [@newrelic/browser-agent](https://www.npmjs.com/package/@newrelic/browser-agent) NPM package. For community discussion and feedback, please visit the [Explorer's Hub](https://forum.newrelic.com/s/), New Relic's community support forum.

## Creating an app in New Relic One

Before instrumenting app code using the NPM package, a Browser App should be configured in New Relic One. This may be done with or without a corresponding APM agent. Once the app has been created, the Copy/Paste JavaScript code on its *Application settings* page will contain the configuration values needed to define options when instantiating the agent via the NPM package.

1. If a browser app does not already exist, create one:
   - From the *New Relic One* navigation panel, click *Add Data*.
   - Select the *Browser monitoring* data source.
   - Choose the *APM* or *Copy/Paste* method.
   - Select or name your app and click *Enable*.
2. From the navigation panel, select *Browser* to view brower apps.
3. Select the desired app and navigate to the *Application settings* page.
4. From the *Copy/Paste JavaScript* box, copy the values of these three properties of the `NREUM` object.
   - `init` – specifies the same browser app settings defined in the *Application settings* page. *Example:*
        ```javascript
        NREUM.init={distributed_tracing:{enabled:true},privacy:{cookies_enabled:true},ajax:{deny_list:["bam.nr-data.net"]}}
        ```
   - `info` – uniquely identifies the browser app and specifies data ingest endpoints
        ```javascript
        NREUM.info={beacon:"bam.nr-data.net",errorBeacon:"bam.nr-data.net",licenseKey:"NRJS-fc7e0c98ae8d60a31cf",applicationID:"1093685065",sa:1};
        ```
   - `loader_config` – (**optional**) for apps with corresponding backend agents only, specifies an agent ID. *Example:*
        ```javascript
        NREUM.loader_config={accountID:"1234567",trustKey:"1234567",agentID:"0123456789",licenseKey:"NRJS-fc7e0c98ae8d60a31cf",applicationID:"1093685065"}
        ```
5. Use the above configuration values when instantiating the agent using the NPM package. (**See next section.**)


## Adding the agent package to your project

To make the agent available to your build process, install via [NPM](https://docs.npmjs.com/cli/v8/commands/npm-install) or [Yarn](https://classic.yarnpkg.com/lang/en/docs/cli/install/).

```shell
$ npm install @newrelic/browser-agent --save-dev
```

```shell
$ yarn add @newrelic/browser-agent --dev
```

## Using the agent as part of a front-end build process

A typical implementation of the `@newrelic/browser-agent` package involves a JavaScript bundling tool such as [webpack](https://webpack.js.org/), which takes JavaScript entry files and bundles them into an output file containing all dependencies, along with additional files for lazy-loaded chunks. The output script file is then included in the app's HTML page.

The simplest way to implement this NPM package is to start with an existing webpack-enabled front-end web app, then add the agent as an entry point.

As an example, consider a bare-bones webpack implementation with the following partial directory structure:

```
my-app
├── dist
│   ├── index.html
│   ├── my-agent-loader.js
├── src
│   ├── my-agent-instance.js
└── webpack.config.json
```


### `webpack.config.js`

This example takes `my-agent-instance.js` as an entry file and creates a bundle called `my-agent-loader.js` in the `dist` directory. A number of lazy-loaded chunk files will also be produced alongside the main output bundle script.

```javascript
const path = require('path');

module.exports = {
  entry: './src/my-agent-instance.js',
  output: {
    filename: 'my-agent-loader.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
```

### Entry file (`my-agent-instance.js`)

Your entry file should import and instantiate the agent with configuration options taken from the *Copy/Paste JavaScript* block on the *Application settings* page for your browser app in New Relic One.

In this example the configurations (`NREUM.info` and `NREUM.init`) will be defined in the head element of the HTML page at runtime. As shown in a later example, the values of these properties may also be defined explicitly here for inclusion directly in the webpack bundle.

```javascript
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

const options = {
  init: NREUM.init,
  info: NREUM.info
}

new BrowserAgent(options)
```

### App HTML file with agent script (`index.html`)

The webpack JavaScript output file should be included in the `head` element of your app's HTML page before other scripts are executed.

In this example, the app HTML file (`index.html`) exists in the same `dist` directory as `my-agent-loader.js`.

Comparing this example with the contents of the copy-paste box found under `Application settings` for your browser app in New Relic One, the configuration lines (`NREUM.init`, `NREUM.info`, and optionally `NREUM.loader_config`) will be the same, while the script tag for `my-agent-loader.js` replaces the last (long) line of the copy-paste snippet.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Instrumented Page</title>
    <script type="text/javascript">
      <!-- Use the same configuration found in your browser app's copy-paste snippet. -->
      ;window.NREUM||(NREUM={});NREUM.init={...};
      ;NREUM.loader_config={...};
      ;NREUM.info={...};
    </script>
    <!-- Your loader bundle replaces the last line in the copy-paste snippet. -->
    <script src="my-agent-loader.js"></script>
  </head>
  <body>
  </body>
</html>
```

## Passing configuration values directly to the agent constructor

In the above example, the configuration options passed to the `BrowserAgent` class referenced an object called `NREUM` in the global scope, later defined in the app's HTML page just prior to executing the loader script. Another option is to specify these properties at the time you instantiate the agent class, for direct inclusion in the webpack output.

### Example entry file with explicit configuration

```javascript
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

const options = {
  info: {
    beacon: "bam.nr-data.net",
    errorBeacon: "bam.nr-data.net",
    licenseKey: "NRJS-fc7e0c98ae8d60a31cf",
    applicationID: "1093685065",
    sa: 1
  },
  loader_config: {
    accountID: "3709242",
    trustKey: "3709242",
    agentID: "1103226595",
    licenseKey: "NRJS-7efc980c8daea360cf1",
    applicationID: "1093685065"
  },
  init: {
    distributed_tracing: { enabled:true },
    privacy: { cookies_enabled:true },
    ajax: { deny_list: [ "bam.nr-data.net" ] }
  }
}

new BrowserAgent(options)
```

## Turning off features at runtime

Features included in a bundle may be turned off at runtime. While this does not impact the size or number of files in your bundle output, it does reduce the number of chunks lazy-loaded at runtime, which may have a meaningful peformance impact in some cases.

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

The examples above use the `BrowserAgent` class, which is the best option for most use cases. It makes all browser agent features available in the bundle output but provides the ability to turn individual features off selectively at runtime.

Using the base `Agent` class, it is also possible to compose a custom agent by passing an array called `features` in the `options` object, containing only the desired feature modules. Depending on which features are included, this may yield a smaller loader script and fewer lazy-loaded chunk files.

The example below includes three feature modules: `Metrics`, `PageViewEvent`, and `PageViewTiming`.

### Example entry file with custom loader

```javascript
import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'

const options = {
  info: {
    beacon: "bam.nr-data.net",
    errorBeacon: "bam.nr-data.net",
    licenseKey: "NRJS-7efc980c8daea360cf1",
    applicationID: "1093685065",
    sa: 1
  },
  loader_config: {
    accountID: "3709242",
    trustKey: "3709242",
    agentID: "1103226595",
    licenseKey: "NRJS-7efc980c8daea360cf1",
    applicationID: "1093685065"
  },
  init: {
    distributed_tracing: { enabled:true },
    privacy: { cookies_enabled:true },
    ajax: { deny_list: [ "bam.nr-data.net" ] }
  }
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
