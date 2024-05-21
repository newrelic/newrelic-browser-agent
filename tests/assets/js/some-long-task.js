function someLongTask () {
  const startTime = Date.now()
  while (Date.now() - startTime < 100); // long tasks are those >50ms which blocks main thread
}
someLongTask() // trigger the event once here
