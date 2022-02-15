This module provides normalization, aggregation, and harvesting for XHR/fetch network calls. It does NOT capture data automatically. The `xhr-instrument` module must be used alongside this module.

In order to capture errors only from a local scope, initialize as:

```
xhrAggregator.initialize()
```

In order to capture errors from global scope (in addition to local scope):

```
xhrAggregator.initialize(true)
```
