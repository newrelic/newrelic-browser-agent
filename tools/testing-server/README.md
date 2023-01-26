# Browser Agent: Testing Server

This directory contains the code to start the servers used for local testing of the agent as well as integration testing.

## Usage

The servers are currently started and used via the JIL CLI. The below commands can be used to start the server.

```bash
# To start the test server in standalone mode
npm run test-server
```

### Asset Server

The asset server is used to serve the test assets and JIL unit tests from `tests/assets` and `tests/browser`. Additionally, the server will serve static files from the `build/` directory. By default, when started, the server is accessible via http://bam-test-1.nr-local.net:3333

For JIL unit tests, the asset server uses [browserify](https://www.npmjs.com/package/browserify) and [babelify](https://www.npmjs.com/package/babelify) to compile the test and source code on the fly when requested.

The asset server also contains a number of API routes that are used in JIL test cases. See `testRoutes` in `src/asset-server.js`.

### CORS Server

The cors server is a subset of the asset server that only contains the `testRoutes` and is used in XHR tests within JIL unit tests.

### BAM Server

The BAM server contains routes for all the ingest endpoints the agent sends collected data to.

## Test Handles

The test server exposes methods to create and destroy test handles. Test handles allow integration tests to create scheduled replies for the asset or BAM server as well as "expect"-ing XHR calls to those servers. JIL automatically takes care of creating a test handle for each test, passing that handle to the test, and destroying the test handle once the test completes. Each test handle is uniquely identified by a `testId` that is also used by the agent as the license key.

Each of the servers, upon receiving a request, will attempt to find a test handle for the request by extracting the `testId` from the query parameters or from the URL via regex. If a test handle is found, the request will be handed to the test handle for processing before the server is allowed to process the request. If the test handle has any pending replies or expects that match the request, they will be registered to the request for the server to consume once it processes the request.

### Scheduling Reply

A test handle can be used to schedule a reply for a XHR as long as the XHR follows the BAM endpoint pattern or contains a `testId` query parameter. A scheduled response must contain a test function to ensure the reply is correctly scheduled and can contain a response code and/or body.

```javascript
testHandle.scheduleReply('bamServer', {
    test: (request) => {
      const url = new URL(request.url, "resolve://");
      if (url.pathname !== `/events/1/${this.testId}`) {
        return false;
      }

      if (Array.isArray(request.body) && request.body.length > 0) {
        return true;
      }

      if (request?.query?.e) {
        try {
          const events = require("@newrelic/nr-querypack").decode(request.query.e);
          return Array.isArray(events) && events.length > 0;
        } catch (error) {
          return false;
        }
      }
    },
    statusCode: 429
  })
```

Scheduled replies are applied to requests in a FIFO manner. If multiple replies are scheduled, the first one that matches the request is the one that will be used.

### Expects

Integration tests can create "expect"s. These are like scheduled replies except they don't affect the outgoing reply to a request. Instead, the expect returns a promise that is resolved with an object containing properties of the request and reply once it's test function matches an incoming request on a target server.

```javascript
testHandle.expect('bamServer', {
  test: function(request) {
    const url = new URL(request.url, 'resolve://');
    return url.pathname === `/cat-cors/${router.testId}`
  }
})
```

Expects are applied to requests in a FIFO manner. If multiple expects are created, the first one that matches the request is the one that will be resolved. Below is what is sent in the promise resolution.

```
{
  request: {
    body: string
    query: object (key/value pair)
    headers: object (key/value pair)
    method: string
  }
  reply: {
    statusCode: number
    body: string
  }
}
```

### Future Looking

As we look to move to using WDIO as our integration test runner, keep in mind that each test are ran inside an isolated process. As such, the test function for a scheduled reply or expect should be serializable and should self-contain any `require` statements.

## Fastify Plugins

Each of the servers is a fastify server instance. For more information on fastify, see the [docs](https://www.fastify.io/docs/latest/). Plugins are used to provide the functionality needed for integration testing.

### OSS Plugins

- [@fastify/multipart](https://www.npmjs.com/package/@fastify/multipart): Used to provide multipart form request body decoding. This is really only used in the asset and cors server for test APIs.
- [@fastify/cors](https://www.npmjs.com/package/@fastify/cors): Used to provide CORS headers on all servers and for supporting the testing of distributed tracing headers.
- [@fastify/static](https://www.npmjs.com/package/@fastify/static): Used to serve all the test asset files, built code files, etc. It's root is set to the root of the project allowing any file in the project to be served.

### Agent Injector

The agent inject plugin utilizes the `onSend` hook of fastify to modify outgoing test HTML assets. These assets can contain a number of placeholder text where the plugin can inject the agent, configurations, and additional scripts. Each of these injections is accomplished by piping the fastify response through a set of stream transforms.

#### [Loader Transform](./plugins/agent-injector/loader-transform.js) 

This stream transform looks for `{loader}` in the HTML response, determines which loader to inject, and injects a script tag containing the compiled loader. The loader is pulled from the `/build/` directory and requires that the project be built before the server is started. The determination of the loader used defaults to what is provided to the JIL CLI `-l | --loader` flag (default of `full`). A query parameter can be used (`?loader=spa`) when requesting an HTML asset to override the loader. The polyfill loader can be used in two ways: through the JIL CLI `-P true` flag or by setting the query parameter to a polyfill loader `?loader=spa-polyfill`.

#### [Config Transform](./plugins/agent-injector/config-transform.js)

This stream transform looks for `{config}` in the HTML response, builds the correct agent info and loader_config objects, and injects a script tag containing the configuration code. Additional configuration code is injected to ensure the agent runs in non-ssl mode meaning all BAM requests will be sent using `HTTP` instead of `HTTPS`. The default agent config is contained within the [constants](./constants.js) file. This configuration can be overridden using two query parameters: `?config=<base64 encoded json string>` and `?injectUpdatedLoaderConfig=true`. The config query parameter will be base64 decoded and parsed into a JSON object before being merged with the default config object. Properties in the default config will be overridden by those included in the query parameter. If injectUpdatedLoaderConfig is set to true, the config object will be parsed for properties to be placed in the loader_config agent setting for distributed tracing.

#### [Init Transform](./plugins/agent-injector/init-transform.js)

This stream transform looks for `{init}` in the HTML response, builds the correct agent init object, and injects a script tag containing the init code. Additional init code is injected to ensure the agent runs in non-ssl mode meaning all BAM requests will be sent using `HTTP` instead of `HTTPS`. By default, the init object is empty and only contains values if a query parameter is used: `?init=<base64 encoded json string>`.

#### [Worker Commands Transform](./plugins/agent-injector/worker-commands-transform.js)

This stream transform looks for `{worker-commands}` in the HTML response. Integration tests for web workers can pass scripts to be injected into the HTML page via a query parameter: `?workerCommands=<base64 encoded json string>`. These worker commands should be an array of JavaScript functions serialized as a string. The worker commands are used to issue commands to a worker in order to test certain scenarios like dispatching a network call.

#### [Script Transform](./plugins/agent-injector/script-transform.js)

This stream transform looks for `{script}` in the HTML response and replaces it with a script tag containing a `src` attribute equal to the script query parameter. Additionally, the transform looks for similar replacement areas that contain a path to a static file in the `tests/assets` directory of the repository; `{tests/assets/js/internal/modular/index.js}`. These parts of the HTML will be replaced with a script tag containing the content of the target file.

#### [Polyfills Transform](./plugins/agent-injector/polyfills-transform.js)

This stream transform looks for `{polyfills}` in the HTML response and replaces it with a script tag containing the agent polyfills. This is only done when the JIL CLI `-P` flag is used to enable polyfills. This is useful for JIL unit tests where the full agent, including polyfills, is not loaded but polyfills are still needed for unit testing IE11. The transform uses browserify and babelify to transpile the `cdn/agent-loader/polyfills/polyfills.js` file.

### BAM Parser

The BAM parser plugin hooks into the fastify content parsing to support pre-parsing of querypack body payloads. The body of each request that has a content type of `text/plain` is checked to see if it starts with `bel.`. When it does, the body is transformed using [@newrelic/nr-querypack](https://github.com/newrelic/nr-querypack). This allows routes and plugins that later operate on the request body to do so without the need to first parse it.

### Browserify

The browserify plugin utilizes the `onSend` hook of fastify to modify outgoing test JavaScript assets. When the request URL is for an asset found in `/tests/browser/`, the file will be passed through browserify and babelify along with the JIL CLI `-P` polyfills flag. The output provided should be the transpilled JavaScript code.

### No Cache

The no-cache plugin simply adds headers to all requests to ensure the browser does not perform any caching. This is done to ensure caching from one test case does not affect another test case in the same browser.

### Test Handle

The test handle plugin utilizes the `preHandler` and `onSend` fastify hooks to support test cases that may expect certain network calls or wish to replace the reply of certain network calls. In the `preHandler` hook, the plugin will attempt to parse the test id from the request URL or query parameter and call back to the test server to get the associated test handle. If a test handle is received, the request will be passed through that test handle for processing before fastify is allowed to continue. The test handle, depending on the integration test being ran, may decorate the request with a scheduled reply and/or a deferred expect.

In the `onSend` hook, the plugin checks if the request was decorated with a scheduled reply and/or deferred expect. If a scheduled reply exists, the reply will be modified possibly changing the status code and/or the body of the reply. If a deferred expect exists, it will be resolved with an object containing serializable information about the request and reply.
