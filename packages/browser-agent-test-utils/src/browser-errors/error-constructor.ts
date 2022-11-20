export function constructError(
  errorData: Record<string, string | number | undefined | null>
): Error {
  const error = Object.create(new Error(errorData["message"] as string));

  const errorProxy = new Proxy(error, {
    get(
      target: Error,
      prop: string
    ):
      | string
      | number
      | undefined
      | null
      | (() => string | number | undefined | null) {
      if (prop === "toString") {
        return () => errorData[prop];
      }

      return errorData[prop];
    },
  });

  return errorProxy;
}
