This module provides instrumentation from XHR/fetch network calls.

It can be used to instrument the XHR/fetch APIs globally or within a micro frontend context.

In order to capture ajax calls globally, pass a true flag to the initialize method. This will replace the XHR/fetch APIs on the window object with wrapped versions.

```
xhrInstrument.initialize(true)

// use the xhr-aggregate module with global capture
xhrAggregator.initialize(true)
```

In order to capture ajax calls locally, the client code needs to get a wrapped API function and use it instead of the ones on the window global.

```
xhrInstrument.initialize()
const wrappedFetch = xhrInstrument.getWrappedFetch()
wrappedFetch('http://someurl')

// use the xhr-aggregate module without global capture
xhrAggregator.initialize(false)
```
