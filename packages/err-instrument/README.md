This modules makes sense only in a global context. It observes errors from the global error handler and callbacks from various wrapped APIs.

It works together with the `err-aggregator` package, which needs to be configured to specifically collect global errors.
