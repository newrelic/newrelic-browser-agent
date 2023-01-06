import url from "url";
import path from "path";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const protoPath = path.resolve(__dirname, "testing-server.proto");

export const protoLoaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
