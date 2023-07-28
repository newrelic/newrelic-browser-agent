export class DebugLogger {
  #prefix

  constructor (agent) {
    this.#prefix = `[NRBA: ${agent.agentIdentifier}]: `
  }

  log (msg, ...args) {
    console.log(`${performance.now()} ${this.#prefix}${msg}`, ...args)
  }

  error (msg, ...args) {
    console.error(`${performance.now()} ${this.#prefix}${msg}`, ...args)
  }
}
