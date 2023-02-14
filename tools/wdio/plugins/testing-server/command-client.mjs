import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import { protoPath, protoLoaderOptions } from './constants.mjs'

/**
 * Creates a new gRPC client that allows WDIO child processes to communicate with the
 * testing collector server. This client is created and runs within the child WDIO process.
 * @param commandServerPort Port the gRPC command server is running on
 * @param logger Output logger that has methods like log, warn, error, etc
 * @returns {Promise<ServiceClient>} gRPC client instance
 */
export default async function createClient (commandServerPort, logger) {
  grpc.setLogger(logger)
  grpc.setLogVerbosity(0)

  const packageDefinition = await protoLoader.load(protoPath, protoLoaderOptions)
  const TestingCommandService = grpc.loadPackageDefinition(packageDefinition).TestingCommandService
  return new TestingCommandService(`127.0.0.1:${commandServerPort}`, grpc.ChannelCredentials.createInsecure())
}
