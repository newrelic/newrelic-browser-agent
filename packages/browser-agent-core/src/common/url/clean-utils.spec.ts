import {cleanURL} from "./clean-url";
import {faker} from "@faker-js/faker";

describe("cleanURL", () => {
  test.each([
    null,
    undefined,
    ""
  ])("given an invalid input, then should return empty string", (input?: string | null) => {
    const result = cleanURL(input, false);

    expect(result).toEqual("")
  })

  test("given a valid url, when the url contains a query parameter and keepHash is false, then should return url without query params", () => {
    const url = `${faker.internet.url()}/${faker.datatype.uuid()}/`;
    const queryParam = `${faker.lorem.word()}=${faker.datatype.uuid()}`

    const result = cleanURL(`${url}?${queryParam}`, false);

    expect(result).toEqual(url)
  })

  test("given a valid url, when the url contains a query parameter and keepHash is true, then should return url without query params", () => {
    const url = `${faker.internet.url()}/${faker.datatype.uuid()}/`;
    const queryParam = `${faker.lorem.word()}=${faker.datatype.uuid()}`

    const result = cleanURL(`${url}?${queryParam}`, true);

    expect(result).toEqual(url)
  })

  test("given a valid url, when the url contains a hash value and keepHash is false, then should return url without hash value", () => {
    const url = `${faker.internet.url()}/${faker.datatype.uuid()}/`;
    const hashParam = faker.datatype.uuid()

    const result = cleanURL(`${url}#${hashParam}`, false);

    expect(result).toEqual(url)
  })

  test("given a valid url, when the url contains a hash value and keepHash is true, then should return url with hash value", () => {
    const url = `${faker.internet.url()}/${faker.datatype.uuid()}/`;
    const hashParam = faker.datatype.uuid()

    const result = cleanURL(`${url}#${hashParam}`, true);

    expect(result).toEqual(`${url}#${hashParam}`)
  })
})
