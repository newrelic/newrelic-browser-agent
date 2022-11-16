import {
  formatStackTrace,
  truncateSize,
  MAX_STACK_TRACE_LENGTH,
} from "./format-stack-trace";

describe("formatStackTrace", () => {
  test.each([
    [["", "line 1", "line 2"], "line 1\nline 2"],
    [["line 1", "line 2", ""], "line 1\nline 2"],
    [["line 1", "line 2", "     "], "line 1\nline 2"],
    [["line 1", "line 2", null], "line 1\nline 2"],
  ])(
    "given stack trace array with empty entries, then should exclude those entries in the return",
    (input, expected) => {
      const result = formatStackTrace(input as string[]);

      expect(result).toEqual(expected);
    }
  );

  test("given stack trace array, when stack trace contains more than 100 entries, then return should contain first and last 50 entries", () => {
    const input = [...Array(200)].map((_, i) => `line ${i}`);
    let expectedStart = input.slice(0, 50).join("\n");
    let expectedEnd = input.slice(-50).join("\n");

    const result = formatStackTrace(input);

    expect(result.split("\n").length).toEqual(101);
    expect(result.startsWith(expectedStart)).toEqual(true);
    expect(result.endsWith(expectedEnd)).toEqual(true);
    expect(result.split("\n")[50]).toMatch(
      /^< \.{3}truncated \d+ lines\.{3} >$/
    );
  });
});

describe("truncateSize", () => {
  test("given stack trace string, when stack trace contains less than max character, then should just return input", () => {
    const input = [...Array(10)].map((_, i) => `line ${i}`).join("");

    const result = truncateSize(input);

    expect(result).toEqual(input);
  });

  test("given stack trace string, when stack trace contains more than max character, then should return truncated string", () => {
    const input = [...Array(MAX_STACK_TRACE_LENGTH)]
      .map((_, i) => `line ${i}`)
      .join("");
    const expected = input.slice(0, MAX_STACK_TRACE_LENGTH);

    const result = truncateSize(input);

    expect(result).toEqual(expected);
  });
});
