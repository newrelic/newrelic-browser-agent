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

```html
<script src="https://unpkg.com/@newrelic/browser-agent/bundled"></script>
```

## Usage Examples

### Basic Setup

```javascript
<< App.js >>
// initialize the agent as close to 
// the top level of the application as possible
import NR from '@newrelic/browser-agent'
const options = {
    // See 'Configuring your application'
}
NR.start(options).then(() => {
    console.log("Browser Agent Initialized!")
})
```

### Instrumenting a Micro Front End

The New Relic Browser Agent can maintain separate configuration scopes for each generated bundle.  Multiple bundles, like those used in certain micro front end patterns, can each report their own scoped data to separate New Relic applications.

```javascript
// <<< MICRO FRONT END APP 1 >>>
// ---- App.js ----
import NR from '@newrelic/browser-agent'
const options = {
    // see 'Configuring your application'
}
NR.features.JSERRORS.enabled = true
NR.start(options).then(() => {
    console.log("Browser Agent Initialized!")
})

// ---- MyComponent.js ----
class MyComponent() {
    try {
        ...
    } catch(err) {
        NR.noticeError(err)
        // reports to applicationID 1
    }
}
```

## Configuring your application

The NR interface's `start` method accepts an `options` object to configure the agent:

```js
const options = {
  licenseKey: String
  applicationID: String
  beacon: String
}
NR.start(options)
```

### Get application ID, license key, beacon

You can find `licenseKey`, `applicationID` and `beacon` values in the New Relic UI's Browser Application **Settings** page ([one.newrelic.com](https://one.newrelic.com) > Browser > (select an app) > Settings > Application settings.)

![configuration](https://user-images.githubusercontent.com/4779220/169617807-110f3938-8af9-4aa8-b651-7712589b0792.jpg)

## Features

|Feature|Subfeature|Default|Description|
|-|-|-|-|
|JSERRORS|enabled |true|Enable's `noticeError` method|
|JSERRORS|auto |false|Reports all global errors |


### JavaScript Errors

This NPM package can currently capture JavaScript Error reporting in two ways. These errors will be reported to the appId & licenseKey specified in your [configuration](#configuring-your-application).

```js
import NR from '@newrelic/browser-agent'

// enable API scoped to applicationID
NR.features.JSERRORS.enabled = true

// report global errors to applicationID
NR.features.JSERRORS.auto = true

// enable features before starting the agent
NR.start(options)
```

### Capture JavaScript errors via API

```javascript
NR.features.jserrors.enabled = true
NR.noticeError(new Error())
```

Set `NR.jserrors.enabled` to `true` to report specific errors via the noticeError API.

### Automatically capture global JavaScript errors

```javascript
NR.features.jserrors.auto = true
```

Set `NR.jserrors.auto` to `true` to report all errors on the page.

## Contributing

We encourage your contributions to improve the Browser agent! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@newrelic.com.

For more details on how best to contribute, see [CONTRIBUTING.md](CONTRIBUTING.md)

## License

The Browser agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The Browser agent also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the [third-party notices document](THIRD_PARTY_NOTICES.md).
