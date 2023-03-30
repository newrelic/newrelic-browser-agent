# Unit Testing

We utilize [Jest](https://jestjs.io/docs/getting-started) for the purposes of writing unit tests. Unit tests are meant to be small, fast, and should focus on testing isolated pieces of code. Typically these tests will only import a single source file and test exported functions where given a certain input, a certain output is generated. This documentation will go into details on how the team expects these tests to be wrote, best practices, and general DOs and DONTs.

## Running Unit Tests

After making sure you have the project dependencies installed, executing `npm test` will run all the unit tests. To run just a specific test, you can pass the path of the test file to the test command like so `npm test -- src/features/jserrors/aggregate/format-stack-trace.test.js`. There is also a watch command setup `npm run test:watch` if you are making multiple edits to tests and would like those tests to run after each saved change. To check the state of coverage, use `npm run test:coverage`.

## Writing Tests - Basics

If you are create a new test file for an existing or new source file, remember these best practices:

- **DO** name the test file the same as the target source file but with the `.test.js` extension
- **DO** create the test file in the same directory as the source file

Once you have a test file created, follow these best practices for creating the individual test cases:

- **DONT** create a global `describe` wrapper to hold all the tests
- **DO** create a `describe` to group tests that have similar pre/post test instructions
- **DONT** save state between individual test cases
- **DO** write and assume that each test case will be ran in isolation, parallelized, and share no local or global state
- **DO** use `beforeEach` to instantiate variables and state before each test
- **DO** use `afterEach` to cleanup global state after each test
- **DONT** use `beforeAll` or `afterAll`
- **DO** use the `test` keyword to declare a test case
- **DO** limit the focus of a test to a single scenario

### Focus each test case

Each test case should focus on testing a single scenario. This could be a single set of inputs followed by a single set of `expect` clauses. Tests that instantiate or call the code under test multiple times with different `expect` clauses should typically be split up into individual test cases. This will ensure these tests run quickly and, when a test fails, isolating the failure is much easier.

## Import vs Require

There are two ways to pull in the source fill under test in the test file. The recommended way is to use an `import` at the top of the test file. However, when the source file under test is not stateless, the source file will need to be pulled in using `require` within the test case or within a `beforeEach`.

- **DO** use `import` at the top of the test file to pull in stateless source files
- **DO** use `require` inside a test case or `beforeEach` to pull in a stateful source file
- **DO** reset the jest module cache between test cases using `afterEach` when testing a stateful source file

```js
// Example for pulling in a stateful source file

let methodUnderTest;

beforeEach(() => {
  methodUnderTest = require('./sourceFile').method
})

afterEach(() => {
  jest.resetModules()
})

test(() => {
  const result = methodUnderTest('someInput')

  expect(result).toEqual('someResult')
})
```

