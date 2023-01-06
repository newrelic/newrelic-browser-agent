import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { v4 as uuidv4 } from 'uuid';
import { protoPath, protoLoaderOptions } from "./constants.mjs";

/**
 * Creates a new gRPC server that allows WDIO child processes to communicate with the
 * testing collector server. This server is created and runs within the main WDIO process.
 * @param testingServer TestingServer instance from tools/testing-server that wraps the different
 * servers started for testing purposes.
 * @param logger Output logger that has methods like log, warn, error, etc
 * @returns {Promise<{commandServer: Server, commandPort}>} gRPC server instance
 */
export default async function startServer(testingServer, logger) {
  grpc.setLogger(logger);
  grpc.setLogVerbosity(0)

  const packageDefinition  = await protoLoader.load(protoPath, protoLoaderOptions);
  const TestingCommandService = grpc.loadPackageDefinition(packageDefinition).TestingCommandService;
  const commandServer = new grpc.Server();

  commandServer.addService(TestingCommandService.service, {
    createHandle(_, callback) {
      try {
        const handleId = uuidv4();
        testingServer.collectorServer.server.createCollectorHandle(handleId);
        callback(null, { handleId });
      } catch (error) {
        callback(error);
      }
    },
    destroyHandle({ request }, callback) {
      try {
        testingServer.collectorServer.server.destroyCollectorHandle(request.handleId);
        callback(null, {});
      } catch (error) {
        callback(error);
      }
    },
    getAssetUrl({ request }, callback) {
      try {
        const assetUrl = testingServer.urlFor(`tests/assets/${request.assetPath}`, JSON.parse(request.query));
        callback(null, { assetUrl });
      } catch (error) {
        callback(error);
      }
    }
  })

  let commandPort;
  await new Promise((resolve, reject) => {
    commandServer.bindAsync(
      "0.0.0.0:0",
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          return reject(error);
        }

        commandPort = port;
        commandServer.start();
        resolve();
      }
    );
  });

  return { commandServer, commandPort };
}
