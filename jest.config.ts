import type { Config } from "jest";
import { getJestProjects } from "@nrwl/jest";

const config: Config = {
  projects: getJestProjects(),
  testEnvironment: "jsdom",
  resetMocks: true,
  resetModules: true,
};

export default config;
