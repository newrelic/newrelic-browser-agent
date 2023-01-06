

export class RouterModel {
  #testingServerClient;
  #logger;
  #handleId;

  constructor(testingServerClient, logger) {
    this.#testingServerClient = testingServerClient;
    this.#logger = logger;
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.#testingServerClient.createHandle({}, (error, data) => {
        if (error) {
          return reject(error);
        }

        this.#handleId = data.handleId;
        resolve();
      });
    });
  }

  async disconnect() {
    if (!this.#handleId) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.#testingServerClient.destroyHandle({handleId: this.#handleId}, (error) => {
        if (error) {
          return reject(error);
        }

        this.#handleId = null
        resolve();
      });
    });
  }

  async getAssetUrl(assetPath, query) {
    return await new Promise((resolve, reject) => {
      this.#testingServerClient.getAssetUrl({
        handleId: this.#handleId,
        assetPath,
        query: JSON.stringify(query)
      }, (error, data) => {
        if (error) {
          return reject(error);
        }

        resolve(data.assetUrl);
      })
    });
  }
}
