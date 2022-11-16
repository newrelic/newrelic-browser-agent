import { stringHashCode } from "./string-hash-code";

describe("stringHashCode", () => {
  test.each([
    [undefined, 0], // Return 0 for undefined input
    [null, 0], // Return 0 for null input
    ["", 0], // Return 0 for empty string input
    ["lksjdflksjdf", 32668720]  // Return valid hash of string
  ])(`given input of "%s", then should return "%s"`, (input, expected) => {
      const result = stringHashCode(input as string);

      expect(result).toEqual(expected);
    }
  );
});
