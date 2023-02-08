import { getInfo, isValid, setInfo } from "./state/info";
import { getConfiguration, getConfigurationValue, setConfiguration } from "./state/init";
import { getLoaderConfig, setLoaderConfig } from "./state/loader-config";
import { originals } from "./state/originals";
import { getRuntime, setRuntime } from "./state/runtime";

function isConfigured(agentIdentifier) {
  return isValid(agentIdentifier);
}

// This module acts as a hub that bundles the static and dynamic properties used by each agent instance into one single interface
export {
  getInfo,
  setInfo,
  getConfiguration,
  getConfigurationValue,
  setConfiguration,
  getLoaderConfig,
  setLoaderConfig,
  originals,
  getRuntime,
  setRuntime,
  isConfigured,
};
