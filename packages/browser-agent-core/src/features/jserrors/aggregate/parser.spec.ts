import * as chromeEdge98Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/chrome_edge-v98.json";
import * as chromeEdge107Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/chrome_edge-v107.json";
import * as firefox98Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/firefox-v98.json";
import * as firefox107Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/firefox-v107.json";
import * as ie11Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/ie-v11.json";
import * as safari14Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/safari-v14.json";
import * as safari15Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/safari-v15.json";
import * as safari16Errors from "@newrelic/browser-agent-test-utils/src/browser-errors/data/safari-v16.json";
import { constructError } from "@newrelic/browser-agent-test-utils/src/browser-errors/error-constructor";
import { parseError } from "./parser";
import { faker } from "@faker-js/faker";

let eventEmitter;
let agentRuntime;

beforeEach(() => {
  eventEmitter = {
    emit: jest.fn(),
  };
  agentRuntime = {
    origin: "",
  };
});

test.each(chromeEdge98Errors.map((err, index) => [index, err]))(
  "given chrome/edge v98 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(chromeEdge107Errors.map((err, index) => [index, err]))(
  "given chrome/edge v107 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(firefox98Errors.map((err, index) => [index, err]))(
  "given firefox v98 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(firefox107Errors.map((err, index) => [index, err]))(
  "given firefox v107 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(ie11Errors.map((err, index) => [index, err]))(
  "given ie v11 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(safari14Errors.map((err, index) => [index, err]))(
  "given safari v14 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(safari15Errors.map((err, index) => [index, err]))(
  "given safari v15 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test.each(safari16Errors.map((err, index) => [index, err]))(
  "given safari v16 error (index: %d), then parser should properly produce hash",
  (_, browserError: Record<string, string | number | undefined>) => {
    const error = constructError(browserError);
    const parsedError = parseError(eventEmitter, agentRuntime, error);

    expect(parsedError.hash).toEqual(browserError["expectedHash"]);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  }
);

test("given error without name or constructor, then parsed name should be unknown", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    name: null,
    constructor: null,
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.name).toEqual("unknown");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given null error, then parsed message should be empty string", () => {
  const parsedError = parseError(eventEmitter, agentRuntime, null);

  expect(parsedError.message).toEqual("");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error stack containing nrWrapper, then parsed stack should not contain nrWrapper", () => {
  const alteredError = chromeEdge98Errors[0];
  alteredError.stack +=
    "\n    at nrWrapper (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:60:17)";
  const error = constructError(alteredError);
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).not.toContain("nrWrapper");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing sourceUrl, then parsed stack should contain sourceUrl", () => {
  const sourceUrl = faker.internet.url();
  const error = constructError({
    sourceUrl,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain(sourceUrl);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing sourceUrl matching origin, then parsed stack should contain <inline>", () => {
  const sourceUrl = faker.internet.url();
  const error = constructError({
    sourceUrl,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  agentRuntime.origin = sourceUrl;
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).not.toContain(sourceUrl);
  expect(parsedError.stack).toContain("<inline>");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test('given error without stack, and without sourceUrl, then parsed stack should contain "evaluated code"', () => {
  const error = constructError({
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain("evaluated code");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing line, then parsed stack should contain line number", () => {
  const lineNumber = faker.datatype.number({
    min: 100,
    max: 1000,
    precision: 0,
  });
  const error = constructError({
    line: lineNumber,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain(`:${lineNumber}`);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing lineNumber, then parsed stack should contain line number", () => {
  const lineNumber = faker.datatype.number({
    min: 100,
    max: 1000,
    precision: 0,
  });
  const error = constructError({
    lineNumber,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain(`:${lineNumber}`);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing column, then parsed stack should contain column number", () => {
  const columnNumber = faker.datatype.number({
    min: 100,
    max: 1000,
    precision: 0,
  });
  const error = constructError({
    column: columnNumber,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain(`:${columnNumber}`);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error without stack, and containing columnNumber, then parsed stack should contain column number", () => {
  const columnNumber = faker.datatype.number({
    min: 100,
    max: 1000,
    precision: 0,
  });
  const error = constructError({
    columnNumber,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.stack).toContain(`:${columnNumber}`);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with object type message, and object contains circular reference, then parsed message should be string", () => {
  const message: any = {
    value: faker.lorem.sentence(),
  };
  message.message = message;
  const error = constructError({
    message,
    toString: "0",
    constructor: "function Number() { [native code] }",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.message).toEqual(message.toString());
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with stack, and stack doesnt contain column numbers, then stack should still parse", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack:
      'Error: Blocked a frame with origin "http://bam-test-1.nr-local.net:3334" from accessing a cross-origin frame.\n    at errorTest (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:60)\n    at captureError (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:17)\n    at onload (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html?loader=spa:57)',
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(89984716);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with stack, and stack contains chrome eval, then stack should parse", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack:
      "    at foobar (eval at foobar (http://bam-test-1.nr-local.net:3334/tests/assets/instrumented.html))",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(94834675);
  expect(parsedError.stack).toContain("eval");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with stack, and stack contains ie eval, then stack should parse", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack: "    at Function code (Function code:23:23)",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(94834675);
  expect(parsedError.stack).toContain("Function code");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with stack, and stack anonymous function name, then stack should parse", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack: "    at Function code (Function code:23:23)",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(94834675);
  expect(parsedError.stack).toContain("Function code");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with stack, and stack anonymous function name, then stack should parse", () => {
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack: "anonymous",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(94834675);
  expect(parsedError.stack).toContain("anonymous");
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});

test("given error with null sourceUrl, and no stack, and agentRuntime with null origin, then stack should parse", () => {
  agentRuntime.origin = null;
  const error = constructError({
    ...chromeEdge98Errors[0],
    stack: "    at :45:34",
  });
  const parsedError = parseError(eventEmitter, agentRuntime, error);

  expect(parsedError.hash).toEqual(57403);
  expect(eventEmitter.emit).not.toHaveBeenCalled();
});
