import { canonicalFunctionName } from "./canonical-function-name";

describe("canonicalFunctionName", () => {
  test.each([
    [null, null], // Should return undefined if no function name
    ["test", "test"], // Should return the simple function name
    ["scope1/scope2/func", "func"], // Should remove Firefox scopes
    ["scope1.func", "func"], // Should remove Chrome scopes
    ["  test  ", "test"], // Should trim input value
    ["SomeClass.#privMethod", "#privMethod"], // Should support private class methods
    ["$trim", "$trim"], // Should support methods that start with a $
    ["_trim", "_trim"], // Should support methods that start with a _
    ["<anonymous>", null], // Return undefined ending is non-alphanumeric
  ])(`given input "%s", then should return "%s"`, (input, expected) => {
    const result = canonicalFunctionName(input as string);

    expect(result).toEqual(expected);
  });
});
