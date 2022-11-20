# Browser Errors

This is a collection of error data from supported browsers.

## Obtaining Data

Create a new, or update an existing, html file in `tests/assets` containing the below code.

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    {init} {config} {polyfills} {loader}
    <script>
      var errors = [];
      function captureError(fn) {
        try {
          fn();
        } catch (e) {
          errors.push(e);
        }
      }

      function printErrors() {
        var parsed = [];

        for (var i = 0; i < errors.length; i++) {
          var e = errors[i];
          parsed.push({
            toString: e.toString(),
            name: e.name,
            constructor: String(e.constructor),
            message: e.message,
            fileName: e.fileName,
            lineNumber: e.lineNumber,
            line: e.line,
            columnNumber: e.columnNumber,
            column: e.column,
            stack: e.stack,
            code: e.code,
          });
        }

        document.getElementById("outArea").value = JSON.stringify(parsed);
      }
    </script>
  </head>
  <body>
    <iframe
      id="myframe"
      src="http://www1.w3c-test.org/common/blank.html"
    ></iframe>
    <button
      id="buttonError"
      onclick="(function(){throw new Error('This is an error from a button')})()"
    ></button>

    <textarea rows="10" id="outArea"></textarea>

    <script>
      onload = function () {
        captureError(function errorTest() {
          // Error: Permission denied to access property 'document'
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Property_access_denied
          frames[0].document;
        });
        captureError(function errorTest() {
          // InternalError: too much recursion
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion
          function loop() {
            loop();
          }
          loop();
        });
        captureError(function errorTest() {
          // RangeError: invalid array length
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Invalid_array_length
          var a = [];
          a.length = a.length - 1;
        });
        captureError(function errorTest() {
          // SyntaxError: invalid assignment left-hand side
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse
          JSON.parse("[1, 2, 3, 4,]");
        });
        captureError(function errorTest() {
          // TypeError: "x" is not a function
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_a_function
          var x = 0;
          x("foo");
        });
        captureError(function errorTest() {
          // URIError: malformed URI sequence
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
          encodeURI("\uD800");
        });
        captureError(function errorTest() {
          // ReferenceError: malformed URI sequence
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
          var a = undefinedVariable;
        });
        captureError(function errorTest() {
          // Nested anonymous functions
          (function () {
            (function () {
              (function () {
                throw new Error("This is a test");
              })();
            })();
          })();
        });
        captureError(function errorTest() {
          throw "This is a test error string";
        });
        captureError(function errorTest() {
          throw 0;
        });

        setTimeout(function () {
          printErrors();
        }, 5000);
      };
    </script>
  </body>
</html>
```

Start the sauce labs connect service and local test server.

```bash
npm run sauce:connect

# In a different terminal window
npm run test-server
```

Use sauce labs to load your test page in the target browser. Once loaded, the page will contain a `textarea` that will populate with the error data after 5 seconds.
