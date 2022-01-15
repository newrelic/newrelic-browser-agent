This module provides normalization, aggregation, and harvesting for errors. It does NOT capture errors automatically.

In the simplest use case, it can be used to capture errors manually by calling the `storeError` API function: 

```
errAggregator.storeError(error)
```

Errors can be captured automatically when the `err-instrument` package is present on the page. The aggregator needs to be configured to capture global errors, as the `err-instrument` package specifically observes global errors.

```
errAggregator.initialize(true)
```

Further work might include adding new instrumentations that capture errors only within a micro frontend scope. For example, a React plugin could capture errors from React error boundaries automatically and emit events that this err aggregator will capture only within its bundle's scope (not globally).
