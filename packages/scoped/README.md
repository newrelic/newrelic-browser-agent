This is the main module that clients would import into their applications.

It provides APIs to initialize the agent:

```
import nr from 'nr-browser-core'

nr.setConfiguration({
  jserrors: {
    harvestTimeSeconds: 30
  }
})

nr.init({
  beaconUrl: 'localhost:8181',
  licenseKey: 'abc123',
  appId: 2
})
```

### Future work / ideas

This module is currently designed to be a singleton within the scope of the bundle it is included in. If we think of micro frontend boundaries to be bundles, then this would work. However, if there are use cases for multiple micro frontends existing in the same bundle, then this would not be sufficient.

The question is - do we want to support a use case where a shared module used by multiple applications has its own agent instance internally.

If yes, then things get more complicated from instrumentation side. For example, we would need to figure out how scoped instrumentations would notify only a specific instance of an agent within the same bundle.
