[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# New Relic Browser Agent

The New Relic Browser Agent instruments your website and provides observability into the performance and behavior of your application. This NPM Library is an ***in-progress*** implementation of the New Relic Browser Agent, accessible through `NPM`. Please see the [Differences](#differences) and [Features](#features) sections to compare how this library differs from the other offerings of the New Relic Browser Agent.

## Installation

### Using Package Managers

Using [npm](https://npmjs.org):

```bash
npm install @newrelic/browser-agent
```

or [yarn](https://yarnpkg.com/)

```bash
yarn add @newrelic/browser-agent
```

### Directly in HTML/JS

Using [unpkg](https://unpkg.com/)

See [Using Unpkg](#using-unpkg) for implementation details

ES6 compatible bundle

```html
<script src="https://unpkg.com/@newrelic/browser-agent/dist/bundled/es6/index.js"></script>
```

ES5 compatible bundle

```html
<script src="https://unpkg.com/@newrelic/browser-agent/dist/bundled/es5/index.js"></script>
```

## Usage Examples

### Basic Setup

```javascript
// << App.js >>
// initialize the agent as close to 
// the top level of the application as possible
import NR from '@newrelic/browser-agent'

const options = {
    // See 'Configuring your application'
}
const nr = new NR()

nr.start(options).then(() => {
    console.log("Browser Agent Initialized!")
})
```

### Notice Errors After Setup
```javascript
// << SomeComponent.js >>
// notice handled errors
try { 
    ...
} catch (err){
    nr.noticeError(err)
}

// thrown errors *anywhere* on the page will be captured if `auto` is enabled
```

### Setup Using unpkg

```html
<head>
    <!-- Download and initialize as soon as possible to avoid missing early events -->
    <script src="https://unpkg.com/@newrelic/browser-agent/bundled"></script>
    <script>
        const { BrowserAgent } = NRBA;
        const options = {
            // See 'Configuring your application'
        }
        const agent = new BrowserAgent()
        agent.start(options).then(() => {
            console.log("Browser Agent Initialized!")
        })
    </script>
</head>
```

### Notice Errors after Setup
```javascript
// << somewhere in your app >>

// notice handled errors
try { 
    ...
} catch (err){
    nr.noticeError(err)
}

// thrown errors *anywhere* on the page will be captured if `auto` is enabled
```

### Instrumenting a Micro Front Ends or Multiple Targets

The New Relic Browser Agent can maintain separate configuration scopes by creating new instances. Separate NR instances can each report their own scoped data to separate New Relic applications. 

```javascript
// ---- App.js ----
// Initialize as close to top of page as possible
import { BrowserAgent } from '@newrelic/browser-agent'
const options1 = {
    // see 'Configuring your application'
    licenseKey: 'abc',
    applicationID: '123',
    beacon: 'bam.nr-data.net'
}
const agent1 = new BrowserAgent() 
agent1.features.errors.enabled = true // this is enabled by default, but just for visibility
agent1.start(options1).then(() => {
    console.log("Browser Agent (options1) Initialized!")
})

const options2 = {
    // see 'Configuring your application'
    licenseKey: 'xyz',
    applicationID: '987',
    beacon: 'bam.nr-data.net'
}
const agent2 = new BrowserAgent() 
agent2.features.errors.auto = false // do not capture global errors on this instance
agent2.start(options2).then(() => {
    console.log("Browser Agent (options2) Initialized!")
})

// --- NOTE ---
// thrown errors *anywhere* on the page will be captured if `auto` is enabled in your instance
// agent2 has disabled `auto`, and will not capture globally thrown errors

// ---- NavBarComponent.js ----
class MyComponent() {
    try {
        ...
    } catch(err) {
        agent1.noticeError(err)
        // agent1 instance
        // reports the error to applicationID '123', licenseKey 'abc'
    }
}

// ---- SearchComponent.js ----
class MyComponent() {
    try {
        ...
    } catch(err) {
        agent2.noticeError(err)
        // agent2 instance
        // reports to applicationID '987', licenseKey 'xyz'
    }
}
```

## Configuring your application

The NR interface's `start` method accepts an `options` object to configure the agent:

```js
const options = {
  licenseKey: String // (required)
  applicationID: String // (required)
  beacon: String // (required)
  // ... other configurations
}
nr.start(options)
```

### Get application ID, license key, beacon

You can find `licenseKey`, `applicationID` and `beacon` values in the New Relic UI's Browser Application **Settings** page ([one.newrelic.com](https://one.newrelic.com) > Browser > (select an app) > Settings > Application settings.)

![configuration](https://user-images.githubusercontent.com/4779220/169617807-110f3938-8af9-4aa8-b651-7712589b0792.jpg)

## Features

|Feature|Subfeature|Default|Description|
|-|-|-|-|
|errors |enabled |true|Enable's `noticeError` method|
|errors |auto |false|Reports all global errors |

> Features must be set before calling the .start() method.

### JavaScript Errors

This NPM package can currently capture JavaScript Error reporting in two ways. These errors will be reported to the appId & licenseKey specified in your [configuration](#configuring-your-application).

```js
import { BrowserAgent } from '@newrelic/browser-agent'
const browserAgent = new BrowserAgent()

// enable noticeError() API scoped to applicationID (enabled by default)
browserAgent.features.errors.enabled = true

// report global errors to applicationID (enabled by default)
browserAgent.features.errors.auto = true

// configure features before starting the agent
browserAgent.start(options)
```

### Capture JavaScript errors via API

```javascript
// if browserAgent.features.errors.enabled === true (enabled by default)
browserAgent.noticeError(new Error())
```

Set `browserAgent.errors.enabled` to `true` to report specific errors via the noticeError API.

### Automatically capture global JavaScript errors

```javascript
browserAgent.features.errors.auto = true
```

Set `browserAgent.errors.auto` to `true` to report all errors on the page.


## Differences

The Browser Agent delivered through NPM will eventually offer parity to its copy/paste and APM counterparts, but during this initial development phase, **it should not yet be treated as equivalent**.  Please see the following table describing the capabilities of each.  The availability of these features will change over time.

| Feature | APM Injected | Copy/Paste | NPM |
| ------- | ------------ | ---------- | --- |
| JavaScript Errors | Auto, API | Auto, API | `Auto, API` |
| Page View | Auto | Auto | `None` | 
| Page View Timings | Auto | Auto | `None` |
| Ajax Tracking | Auto | Auto | `None` |
| Page Actions | API | API | `None` |
| Session Traces | Auto | Auto | `None` |
| Browser Interactions (SPA) | Auto, API | Auto, API | `None` |
| Multiple Configurable Instances of Browser Agent on One Page | No | No | `Yes` |
| Configurable Code Splitting | No | No | `Yes` |
| IDE Code Completion and Typings | No | No | `Yes` |  


## Contributing

We encourage your contributions to improve the Browser agent! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

For more details on how best to contribute, see [CONTRIBUTING.md](CONTRIBUTING.md)

## License

The Browser agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The Browser agent also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the [third-party notices document](THIRD_PARTY_NOTICES.md).
