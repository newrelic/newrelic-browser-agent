# Browser Agent: Testing Server

This package is used to start servers required for integration testing of the agent.

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

The cors server is a subset of the asset server that only contains the `testRoutes` and is used in XHR tests for cross-origin network calls.

### Mock Ingest Server

The `src/router.js` file starts a server containing routes that mock/mimic the browser agent production ingest service (https://bam.nr-data.net/). Additionally, the server exposes a number of functions that JIL tests can use to "expect" and "await" certain ingest calls.
