import { NrParsedError, NrErrorStackTraceFrame } from "./aggregate-interfaces";
import { cleanURL } from "../../../common/url/clean-url";
import { stringHashCode } from "./string-hash-code";

const classNameRegex = /function (.+?)\s*\(/;
const chromeStackRegex =
  /^\s*at (?:((?:\[object object\])?(?:[^(]*\([^)]*\))*[^()]*(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?)?:(\d+)(?::(\d+))?\)?\s*$/i;
const geckoStackRegex =
  /^\s*(?:(\S*|global code)(?:\(.*?\))?@)?((?:file|http|https|chrome|safari-extension).*?):(\d+)(?::(\d+))?\s*$/i;
const chromeEvalStackRegex =
  /^\s*at .+ \(eval at \S+ \((?:(?:file|http|https):[^)]+)?\)(?:, [^:]*:\d+:\d+)?\)$/i;
const ieEvalStackRegex = /^\s*at Function code \(Function code:\d+:\d+\)\s*/i;
const canonicalFunctionNameRegex = /([a-z0-9]+)$/i;

/**
 * Just a general note on parsing errors:
 *
 * JS allows virtually anything to be thrown including
 * object, numbers, string, other primitives, null, and
 * undefined. The type for error is therefore correctly
 * set to "any".
 */

/**
 * Attempts to parse anything that can be "thrown" into a set of properties that can be
 * sent to NR BAM endpoint.
 */
export function parseError(
  eventEmitter: any,
  agentRuntime: any,
  error: any | null
): NrParsedError {
  try {
    const { stack, canonicalStack } = parseStackTrace(
      eventEmitter,
      agentRuntime,
      error
    );
    const parsedError: NrParsedError = {
      name: parseClassName(eventEmitter, error),
      message: parseErrorMessage(eventEmitter, error),
      stack,
      hash: stringHashCode(canonicalStack as string),
    };

    if (
      parsedError.message &&
      typeof parsedError.message !== "string" &&
      typeof (parsedError.message as any).toString === "function"
    ) {
      parsedError.message = (parsedError.message as any).toString();
    }

    // Uncomment the below lines to debug tests cases
    // The column number may regularly change with code changes to the agent
    // causing integration tests to fail.
    // console.log(canonicalStack)

    return parsedError;
  } catch (ex) /* istanbul ignore next */ {
    eventEmitter.emit("internal-error", [ex]);
    return {};
  }
}

/**
 * Attempts to extract the name of the class being passed in.
 * @example throw "this is a string error" => "String"
 * @example throw new Error("this is an error") => "Error"
 * @example throw null => "unknown"
 */
function parseClassName(eventEmitter: any, error: any): string {
  try {
    if (error && error.name) {
      return error.name;
    }

    if (error && error.constructor) {
      const results = classNameRegex.exec(String(error.constructor));

      if (Array.isArray(results) && results.length > 1) {
        return results[1];
      }
    }

    return "unknown";
  } catch (ex) /* istanbul ignore next */ {
    eventEmitter.emit("internal-error", [ex]);
    return "unknown";
  }
}

/**
 * Attempts to extract the message of the error.
 * @example throw "this is a string error" => "this is a string error"
 * @example throw new Error("this is an error") => "this is an error"
 * @example throw null => ""
 */
function parseErrorMessage(eventEmitter: any, error: any): string {
  try {
    if (!error) {
      return "";
    }

    if (error && error.message) {
      return error.message;
    }

    return error.toString();
  } catch (ex) /* istanbul ignore next */ {
    eventEmitter.emit("internal-error", [ex]);
    return "";
  }
}

/**
 * Parses the stack trace string from an error into a set of frames that eliminates
 * the nrWrapper, if it exists.
 */
export function parseStackTrace(
  eventEmitter: any,
  agentRuntime: any,
  error: any
): { stack: string; canonicalStack?: string } {
  try {
    if (!error) {
      return { stack: "" };
    }

    const cleanedOrigin = cleanURL(agentRuntime.origin);

    // If the error contains a stack trace, parse and return it
    if (typeof error.stack === "string") {
      const splitStack = ((error as Error).stack as string).split("\n");
      const stackLines: string[] = [];
      const canonicalStackLines: string[] = [];
      for (let i = 0; i < splitStack.length; i++) {
        let nextStackLine = splitStack[i];
        const parsedStackLine = stackLineParser(nextStackLine);

        if (!parsedStackLine) {
          stackLines.push(nextStackLine);
          continue;
        }

        if (isStackNrWrapper(parsedStackLine)) {
          break;
        }

        if (
          typeof parsedStackLine.url === "string" &&
          parsedStackLine.url.trim().length !== 0
        ) {
          const canonicalUrl = canonicalizeURL(
            parsedStackLine.url,
            cleanedOrigin
          );
          if (parsedStackLine.url !== canonicalUrl) {
            nextStackLine = nextStackLine.replace(
              parsedStackLine.url,
              canonicalUrl
            );
            parsedStackLine.url = canonicalUrl;
          }
        }

        stackLines.push(nextStackLine);
        canonicalStackLines.push(canonicalizeStackFrame(parsedStackLine));
      }

      if (canonicalStackLines.length > 0) {
        return {
          stack: stackLines.join("\n"),
          canonicalStack: canonicalStackLines.join("\n"),
        };
      }
    }

    // If the error does not contain a stack trace, try other methods of parsing
    let stack = "";
    let canonicalStack = "";

    if (typeof error.name === "string") {
      stack += error.name;
    } else {
      stack += parseClassName(eventEmitter, error);
    }

    if (typeof error.message === "string") {
      stack += `: ${error.message}`;
    } else if (typeof error.toString === "function") {
      stack += `: ${error.toString()}`;
    }

    if (typeof error.sourceUrl === "string") {
      const canonicalUrl = canonicalizeURL(error.sourceUrl, cleanedOrigin);
      stack += `    at ${canonicalUrl}`;
      canonicalStack += canonicalUrl;
    } else {
      stack += "    in evaluated code";
      canonicalStack += "evaluated code";
    }

    if (typeof error.line === "number") {
      stack += `:${error.line}`;
      canonicalStack += `:${error.line}`;
    } else if (typeof error.lineNumber === "number") {
      stack += `:${error.lineNumber}`;
      canonicalStack += `:${error.lineNumber}`;
    }

    if (typeof error.column === "number") {
      stack += `:${error.column}`;
    } else if (typeof error.columnNumber === "number") {
      stack += `:${error.columnNumber}`;
    }

    return { stack, canonicalStack };
  } catch (ex) /* istanbul ignore next */ {
    eventEmitter.emit("internal-error", [ex]);
    return { stack: "" };
  }
}

/**
 * Attempts to parse out the url, function name, line, and column numbers from
 * a stack trace.
 */
function stackLineParser(line: string): NrErrorStackTraceFrame | null {
  let parts = line.match(geckoStackRegex);

  if (!parts) {
    parts = line.match(chromeStackRegex);
  }

  if (parts) {
    return {
      url: parts[2],
      func:
        (parts[1] !== "Anonymous function" &&
          parts[1] !== "global code" &&
          parts[1]) ||
        null,
      line: parseInt(parts[3]),
      column: parts[4] ? parseInt(parts[4]) : undefined,
    };
  }

  if (
    line.match(chromeEvalStackRegex) ||
    line.match(ieEvalStackRegex) ||
    line === "anonymous"
  ) {
    return { func: "evaluated code" };
  }

  return null;
}

/**
 * Checks if the function name of a frame is equal to "nrWrapper". The "nrWrapper"
 * method is what would appear for errors that bubble up through a wrapped function.
 */
function isStackNrWrapper(stackFrame: NrErrorStackTraceFrame): boolean {
  if (
    stackFrame &&
    typeof stackFrame.func === "string" &&
    stackFrame.func.indexOf("nrWrapper") >= 0
  ) {
    return true;
  }

  return false;
}

/**
 * Cleans the stack trace url of query and hash parameters before comparing
 * to the current page origin. If these match, the script that threw the error
 * was inlined into the HTML and we will return "<inline>".
 */
function canonicalizeURL(scriptUrl?: string, originUrl?: string): string {
  const cleanedUrl = cleanURL(scriptUrl);
  if (cleanedUrl === originUrl) {
    return "<inline>";
  } else {
    return cleanedUrl;
  }
}

/**
 * Parses a stack trace frame back into a string that is as close to being
 * the same across browsers. For newer browsers, this should always produce
 * the same output. Older browsers may be missing some items like the column
 * number.
 */
function canonicalizeStackFrame(stackFrame: NrErrorStackTraceFrame): string {
  let stringBuilder = "";

  const func = canonicalizeFunctionName(stackFrame.func);
  if (func) {
    stringBuilder += `${func}@`;
  }
  if (typeof stackFrame.url === "string") {
    stringBuilder += stackFrame.url;
  }
  if (typeof stackFrame.line === "number") {
    stringBuilder += `:${stackFrame.line}`;
  }

  return stringBuilder;
}

/**
 * Trim down the provided function name.
 */
export function canonicalizeFunctionName(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const match = input.trim().match(canonicalFunctionNameRegex);
  if (Array.isArray(match) && match.length > 1) {
    return match[1];
  }

  return null;
}
