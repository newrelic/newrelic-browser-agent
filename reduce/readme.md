# reduce

A simple reduce function with the same api as [].reduce

## reduce(array, cb[, seed])

The first time cb is called it gets the seed value and the first value of the
array. If there isn't a seed value it is called with the first two values of
the array.

On each subsequent call cb is called with the previously returned value,
and the next value from the array.

Reduce then returns the value returned by the last call to cb.

