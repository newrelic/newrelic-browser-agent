import { faker } from "@faker-js/faker";
import { browserErrorUtils } from "../../../../tools/testing-utils";
import { computeStackTrace } from "./compute-stack-trace";

const baseMockError = {
  toString: "RangeError: Invalid array length",
  name: "RangeError",
  constructor: "function RangeError() { [native code] }",
  message: "Invalid array length",
  stack:
    "RangeError: Invalid array length\n    at errorTest (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:74:16)\n    at captureError (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:17:9)\n    at onload (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:70:5)",
};

test("parsing should return a failure for a null error object", () => {
  const result = computeStackTrace(null);

  expect(result).toEqual(
    expect.objectContaining({
      mode: "failed",
      stackString: "",
      frames: [],
    })
  );
});

describe("errors with stack property", () => {
  test("parsed name should be unknown when name and constructor are missing", () => {
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      name: null,
      constructor: null,
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: "unknown",
        message: mockError.message,
        stackString: mockError.stack,
      })
    );
  });

  test("parsed stack should not contain nrWrapper", () => {
    const alteredError = baseMockError;
    alteredError.stack +=
      "\n    at nrWrapper (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:60:17)";
    const mockError = browserErrorUtils.constructError(alteredError);

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: mockError.name,
        message: mockError.message,
        stackString: expect.not.stringContaining("nrWrapper"),
      })
    );
    expect(result.frames).not.toContainEqual(
      expect.objectContaining({
        func: "nrWrapper",
      })
    );
  });

  test("stack should still parse when column numbers are missing", () => {
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      stack:
        'Error: Blocked a frame with origin "http://bam-test-1.nr-local.net:3334" from accessing a cross-origin frame.\n    at errorTest (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:60)\n    at captureError (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:17)\n    at onload (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:57)',
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: mockError.name,
        message: mockError.message,
        stackString: mockError.stack,
      })
    );
    expect(result.frames.length).toEqual(3);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "errorTest",
        column: null,
      })
    );
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "captureError",
        column: null,
      })
    );
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "onload",
        column: null,
      })
    );
  });

  test("parser can handle chrome eval stack", () => {
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      stack:
        "    at foobar (eval at foobar (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html))",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: mockError.name,
        message: mockError.message,
        stackString: mockError.stack,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "evaluated code",
      })
    );
  });

  test("parser can handle ie eval stack", () => {
    const mockError = browserErrorUtils.constructError({
      toString: "TypeError: Permission denied",
      name: "TypeError",
      constructor: "\nfunction TypeError() {\n    [native code]\n}\n",
      message: "Permission denied",
      stack: "    at Function code (Function code:23:23)",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: mockError.name,
        message: mockError.message,
        stackString: mockError.stack,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "evaluated code",
      })
    );
  });

  test("parser can handle stack with anonymous function", () => {
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      stack: "anonymous",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "stack",
        name: mockError.name,
        message: mockError.message,
        stackString: mockError.stack,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "evaluated code",
      })
    );
  });
});

describe("errors without stack property and with line property", () => {
  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test("parsed stack should contain sourceURL and line number", () => {
    const sourceURL = faker.internet.url();
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      stack: undefined,
      line: 100,
      sourceURL,
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "sourceline",
        name: mockError.name,
        message: mockError.message,
        stackString: `${mockError.name}: ${mockError.message}\n    at ${sourceURL}:${mockError.line}`,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        url: sourceURL,
        line: mockError.line,
      })
    );
  });

  /**
   * @deprecated sourceURL is no longer present in errors for any browsers we support
   */
  test("parsed stack should contain sourceURL, line number, and column number", () => {
    const sourceURL = faker.internet.url();
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined,
      sourceURL,
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "sourceline",
        name: mockError.name,
        message: mockError.message,
        stackString: `${mockError.name}: ${mockError.message}\n    at ${sourceURL}:${mockError.line}:${mockError.column}`,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        url: sourceURL,
        line: mockError.line,
        column: mockError.column,
      })
    );
  });

  test('parsed stack should contain "evaluated code" if sourceURL property is not present', () => {
    const mockError = browserErrorUtils.constructError({
      ...baseMockError,
      line: 100,
      column: 200,
      stack: undefined,
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "sourceline",
        name: mockError.name,
        message: mockError.message,
        stackString: `RangeError: ${mockError.message}\n    in evaluated code`,
      })
    );
    expect(result.frames.length).toEqual(1);
    expect(result.frames).toContainEqual(
      expect.objectContaining({
        func: "evaluated code",
      })
    );
  });

  // TODO: computeStackTraceBySourceAndLine does not respect firefox lineNumber and columnNumber properties when stack is empty
});

/**
 * These tests are here because JS allows you to throw absolutely anything as an
 * error, including primitives.
 */
describe("errors that are messages only or primitives", () => {
  test("parser should get error name from constructor", () => {
    const mockError = browserErrorUtils.constructError({
      toString: "0",
      constructor: "function Number() { [native code] }",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "nameonly",
        name: "Number",
        stackString: "Number: undefined",
        frames: [],
      })
    );
  });

  test("parser should get error name from name property", () => {
    const mockError = browserErrorUtils.constructError({
      toString: "0",
      name: faker.datatype.uuid(),
      constructor: "function Number() { [native code] }",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "nameonly",
        name: mockError.name,
        stackString: `${mockError.name}: undefined`,
        frames: [],
      })
    );
  });

  test("parser should include the message property", () => {
    const mockError = browserErrorUtils.constructError({
      toString: "0",
      name: faker.datatype.uuid(),
      message: faker.datatype.uuid(),
      constructor: "function Number() { [native code] }",
    });

    const result = computeStackTrace(mockError);

    expect(result).toEqual(
      expect.objectContaining({
        mode: "nameonly",
        name: mockError.name,
        message: mockError.message,
        stackString: `${mockError.name}: ${mockError.message}`,
        frames: [],
      })
    );
  });
});

// describe('')
