/** IE9, IE10, IE11, and pre es6 browsers require some or all of the following polyfills. **/
import 'core-js/stable/promise'
import 'core-js/stable/array/includes'
import 'core-js/stable/object/assign'
import 'core-js/stable/object/entries'

// promise
// ie - none
// safari - 7+
// ios - 8+
// chrome - 33+
// edge - 12+
// ff - 29+

// not in use currently.... but be aware this feature of promises has much different benchmark support
// promise.any, promise.allSettled
// ie - none
// safari - 14+
// ios - 14+
// chrome - 85+
// edge - 105+
// ff - 79+

// making note because this feature of promises has different benchmark support
// promise.any
// ie - none
// safari - 8
// ios - 8+
// chrome - 32+
// edge - 12+
// ff - 29+
