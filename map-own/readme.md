# map-own

Map over the own properties of an object.

## mapOwn(obj, fn)

Call fn with the args (key, value) for every own key in the object,
and return an array of the values returned from the fn calls.

```javascript
// One way to use it as an Object.keys replacement
var obj = {a: 1, b: 2, c:3}
var arr = mapOwn(obj, function (key, value) {
  return key
})
console.log(arr)
// [ a, b, c ]
```

