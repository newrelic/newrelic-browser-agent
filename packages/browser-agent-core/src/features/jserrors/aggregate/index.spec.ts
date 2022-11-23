import { faker } from "@faker-js/faker";
import { NrParsedError } from "./aggregate-interfaces";

let agentIdentifier: string;
let aggregator;
let eventEmitter;
let agentRuntime;
let agentConfig;
let agentInfo;
let scheduler;
let parserFn;
let registerFn;
let handleFn;

beforeEach(() => {
  agentIdentifier = faker.datatype.uuid();
  aggregator = {
    take: jest.fn(),
    merge: jest.fn(),
    store: jest.fn(),
  };
  eventEmitter = {
    on: jest.fn(),
  };
  agentRuntime = {
    features: { err: true },
  };
  agentConfig = {};
  agentInfo = {
    jsAttributes: {},
  };
  parserFn = jest.fn();
  registerFn = jest.fn();
  handleFn = jest.fn();

  jest.doMock("../../../common/event-emitter/contextual-ee", () => ({
    __esModule: true,
    ee: {
      get: () => eventEmitter,
    },
  }));
  jest.doMock("../../../common/event-emitter/register-handler", () => ({
    __esModule: true,
    registerHandler: registerFn,
  }));
  jest.doMock("../../../common/event-emitter/handle", () => ({
    __esModule: true,
    handle: handleFn,
  }));
  jest.doMock("../../../common/config/state/init", () => ({
    __esModule: true,
    getConfigurationValue: (_, configurationKey) => {
      let value = null;
      (configurationKey.split(".") || []).forEach((key) => {
        if (!value) {
          value = agentConfig[key];
        } else {
          value = value[key];
        }
      });
      return value;
    },
  }));
  jest.doMock("../../../common/config/state/runtime", () => ({
    __esModule: true,
    getRuntime: jest.fn(() => agentRuntime),
  }));
  jest.doMock("../../../common/config/state/info", () => ({
    __esModule: true,
    getInfo: jest.fn(() => agentInfo),
  }));
  jest.doMock("../../../common/harvest/harvest-scheduler", () => ({
    __esModule: true,
    HarvestScheduler: class {
      options = {};
      harvest = {
        on: jest.fn(),
      };
      startTimer = jest.fn();

      constructor(_, options) {
        this.options = options;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        scheduler = this;
      }
    },
  }));
  jest.doMock("./parser", () => ({
    __esModule: true,
    parseError: parserFn,
  }));
});

afterEach(() => {
  jest.resetAllMocks();
  jest.resetModules();
});

test("given feature not instrumented, then should not setup listeners", () => {
  agentRuntime.features.err = false;

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  expect(eventEmitter.on).not.toHaveBeenCalled();
  expect(registerFn).not.toHaveBeenCalled();
  expect(scheduler).not.toBeDefined();
});

describe("scheduler events", () => {
  let body;

  beforeEach(() => {
    body = {
      err: [
        {
          params: {},
          metrics: {},
        },
      ],
      ierr: [
        {
          params: {},
          metrics: {},
        },
      ],
    };
    jest.spyOn(aggregator, "take").mockReturnValue(body);
  });

  describe("onHarvestStarted", () => {
    test("given body from aggregator, then payload should contain body", () => {
      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      const result = harvestStartedFn({});

      expect(result.body).toEqual(body);
    });

    test("given release ids, then payload should contain release ids", () => {
      agentRuntime.releaseIds = {
        [faker.lorem.word()]: faker.datatype.uuid(),
      };

      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      const result = harvestStartedFn({});

      expect(result.qs.ri).toEqual(JSON.stringify(agentRuntime.releaseIds));
    });

    test("given no release ids, then payload should not contain release id property", () => {
      agentRuntime.releaseIds = {};

      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      const result = harvestStartedFn({});

      expect(result.qs.ri).not.toBeDefined();
    });

    test("given errors in previous harvest, then payload should not contain page view error property", () => {
      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];

      const result1 = harvestStartedFn({});
      expect(result1.qs.pve).toEqual("1");

      const result2 = harvestStartedFn({});
      expect(result2.qs.pve).not.toBeDefined();
    });
  });

  describe("onHarvestFinished", () => {
    test("given falsy harvestFinished retry property, then aggregator merge should not be called", () => {
      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      harvestStartedFn({ retry: true });

      const harvestFinishedFn = scheduler.options.onFinished;
      harvestFinishedFn({ retry: false });

      expect(aggregator.merge).not.toHaveBeenCalled();
    });

    test("given falsy harvestStarted retry property, then aggregator merge should not be called", () => {
      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      harvestStartedFn({ retry: false });

      const harvestFinishedFn = scheduler.options.onFinished;
      harvestFinishedFn({ retry: true });

      expect(aggregator.merge).not.toHaveBeenCalled();
    });

    test("given retry, then aggregator merge should be called", () => {
      new (require("./index").Aggregate)(agentIdentifier, aggregator);

      const harvestStartedFn = jest.mocked(scheduler.harvest.on).mock
        .calls[0][1];
      harvestStartedFn({ retry: true });

      const harvestFinishedFn = scheduler.options.onFinished;
      harvestFinishedFn({ retry: true });

      expect(aggregator.merge).toHaveBeenCalledTimes(2);
    });
  });
});

test("given an error, when error is not internal, and runtime has an error handler that returns true, then error should not be further processed", () => {
  jest.mocked(parserFn).mockReturnValue({});
  agentRuntime.onerror = jest.fn().mockReturnValue(true);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});

  expect(parserFn).not.toHaveBeenCalled();
});

test("given an error, when error is not internal, and runtime has an error handler that returns false, then error should be further processed", () => {
  jest.mocked(parserFn).mockReturnValue({});
  agentRuntime.onerror = jest.fn().mockReturnValue(false);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});

  expect(parserFn).toHaveBeenCalled();
  expect(aggregator.store).toHaveBeenCalled();
});

test("given an internal error, when runtime has an error handler that returns true, then error should be further processed", () => {
  jest.mocked(parserFn).mockReturnValue({});
  agentRuntime.onerror = jest.fn().mockReturnValue(true);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), true, {});

  expect(parserFn).toHaveBeenCalled();
  expect(aggregator.store).toHaveBeenCalled();
});

test("given a previously reported error, then params should contain browser_stack_hash", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});
  storeErrorFn({}, Date.now(), false, {});

  expect(aggregator.store).toHaveBeenCalledTimes(2);
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      stack_trace: parsedError.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      browser_stack_hash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
});

test("given two errors, when stack is different, then errors shouldn't be bucketed", () => {
  const parsedErrorA = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  const parsedErrorB = {
    ...parsedErrorA,
    stack: faker.datatype.uuid(),
  };
  jest
    .mocked(parserFn)
    .mockReturnValueOnce(parsedErrorA)
    .mockReturnValueOnce(parsedErrorB);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});
  storeErrorFn({}, Date.now(), false, {});

  expect(aggregator.store).toHaveBeenCalledTimes(2);
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      stack_trace: parsedErrorA.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      stack_trace: parsedErrorB.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
});

test("given two errors, when name is different, then errors shouldn't be bucketed", () => {
  const parsedErrorA = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  const parsedErrorB = {
    ...parsedErrorA,
    name: faker.lorem.word(),
  };
  jest
    .mocked(parserFn)
    .mockReturnValueOnce(parsedErrorA)
    .mockReturnValueOnce(parsedErrorB);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});
  storeErrorFn({}, Date.now(), false, {});

  expect(aggregator.store).toHaveBeenCalledTimes(2);
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      exceptionClass: parsedErrorA.name,
      stack_trace: parsedErrorA.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      exceptionClass: parsedErrorB.name,
      stack_trace: parsedErrorA.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
});

test("given two errors, when message is different, then errors shouldn't be bucketed", () => {
  const parsedErrorA = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  const parsedErrorB = {
    ...parsedErrorA,
    message: faker.lorem.sentence(),
  };
  jest
    .mocked(parserFn)
    .mockReturnValueOnce(parsedErrorA)
    .mockReturnValueOnce(parsedErrorB);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});
  storeErrorFn({}, Date.now(), false, {});

  expect(aggregator.store).toHaveBeenCalledTimes(2);
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      message: parsedErrorA.message,
      stack_trace: parsedErrorA.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.objectContaining({
      message: parsedErrorB.message,
      stack_trace: parsedErrorA.stack,
      stackHash: expect.any(Number),
    }),
    expect.any(Object),
    expect.any(Object)
  );
});

test("given an error, when reporting does not include time, then should use now utility method to get time", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);

  const nowFn = jest.fn(() => Date.now());
  jest.doMock("../../../common/timing/now", () => ({
    __esModule: true,
    now: nowFn,
  }));

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, null, false, {});

  expect(nowFn).toHaveBeenCalledTimes(1);
});

test("given an error, when global js attributes are set, then custom params should include js attributes", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);
  agentInfo.jsAttributes = {
    stringAttribute: faker.datatype.uuid(),
    objectAttribute: {
      [faker.datatype.uuid()]: faker.datatype.uuid(),
    },
  };

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, null, false, {});

  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.any(Object),
    expect.any(Object),
    expect.objectContaining({
      stringAttribute: agentInfo.jsAttributes.stringAttribute,
      objectAttribute: JSON.stringify(agentInfo.jsAttributes.objectAttribute),
    })
  );
});

test("given an error, when global js attributes are set, and custom attributes are passed with error, then passed custom params should override js attributes", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);
  agentInfo.jsAttributes = {
    stringAttribute: faker.datatype.uuid(),
    objectAttribute: {
      [faker.datatype.uuid()]: faker.datatype.uuid(),
    },
    overriddenAttribute: faker.datatype.uuid(),
  };
  const customAttributes = {
    customStringAttribute: faker.datatype.uuid(),
    customObjectAttribute: {
      [faker.datatype.uuid()]: faker.datatype.uuid(),
    },
    overriddenAttribute: faker.datatype.uuid(),
  };

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, null, false, customAttributes);

  expect(aggregator.store).toHaveBeenCalledWith(
    "err",
    expect.any(String),
    expect.any(Object),
    expect.any(Object),
    expect.objectContaining({
      stringAttribute: agentInfo.jsAttributes.stringAttribute,
      objectAttribute: JSON.stringify(agentInfo.jsAttributes.objectAttribute),
      customStringAttribute: customAttributes.customStringAttribute,
      customObjectAttribute: JSON.stringify(
        customAttributes.customObjectAttribute
      ),
      overriddenAttribute: customAttributes.overriddenAttribute,
    })
  );
});

test("given an error, when stack exceeds maximum, then stack should be truncated", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.lorem.lines(65530),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, null, false, {});

  const storedStack = jest.mocked(aggregator.store).mock.calls[0][2]
    .stack_trace;
  expect(storedStack.length).toEqual(65530);
});

test("given an error, when stack is null, then stack should be empty string", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: null,
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, null, false, {});

  const storedStack = jest.mocked(aggregator.store).mock.calls[0][2]
    .stack_trace;
  expect(storedStack).toEqual("");
});

test("given an error, when errorAgg adds an interaction id, then aggregator store should not be called", () => {
  const parsedError = {
    name: faker.lorem.word(),
    message: faker.lorem.sentence(),
    stack: faker.datatype.uuid(),
    hash: faker.datatype.number(),
  };
  jest.mocked(parserFn).mockReturnValue(parsedError);
  jest.mocked(handleFn).mockImplementation((_, errArr) => {
    errArr[2]._interactionId = faker.datatype.number();
  });

  new (require("./index").Aggregate)(agentIdentifier, aggregator);

  const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
  storeErrorFn({}, Date.now(), false, {});

  expect(aggregator.store).not.toHaveBeenCalled();
});

describe("interaction events", () => {
  let interaction: any;
  let parsedError: NrParsedError;

  beforeEach(() => {
    interaction = {
      id: faker.datatype.number(),
      root: {
        attrs: {
          id: faker.datatype.number(),
          custom: {},
        },
      },
    };
    jest.mocked(handleFn).mockImplementation((_, errArr) => {
      errArr[2]._interactionId = interaction.id;
    });

    parsedError = {
      name: faker.lorem.word(),
      message: faker.lorem.sentence(),
      stack: faker.datatype.uuid(),
      hash: faker.datatype.number(),
    };
    jest.mocked(parserFn).mockReturnValue(parsedError);
  });

  test("given an error, when interaction saved, then error should be stored in the aggregator", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        browserInteractionId: interaction.root.attrs.id
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test("given an error, when interaction discarded, then error should be stored in the aggregator", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    const interactionDiscardedFn = jest.mocked(eventEmitter.on).mock.calls[1][1];
    interactionDiscardedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        _interactionNodeId: undefined
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test("given an error, when different interaction saved, then error should not be stored in the aggregator", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    interaction.id = faker.datatype.number();
    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).not.toHaveBeenCalled();
  });

  test("given an error, when different interaction discarded, then error should not be stored in the aggregator", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    interaction.id = faker.datatype.number();
    const interactionDiscardedFn = jest.mocked(eventEmitter.on).mock.calls[1][1];
    interactionDiscardedFn(interaction);

    expect(aggregator.store).not.toHaveBeenCalled();
  });

  test("given an error, when interaction saved, and interaction contains custom params, then custom params should include interaction params", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    interaction.root.attrs.custom = {
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        browserInteractionId: interaction.root.attrs.id
      }),
      expect.any(Object),
      expect.objectContaining(interaction.root.attrs.custom)
    );
  });

  test("given an error, when interaction discarded, and interaction contains custom params, then custom params should include interaction params", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    interaction.root.attrs.custom = {
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const interactionDiscardedFn = jest.mocked(eventEmitter.on).mock.calls[1][1];
    interactionDiscardedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        _interactionNodeId: undefined
      }),
      expect.any(Object),
      expect.objectContaining(interaction.root.attrs.custom)
    );
  });

  test("given an error, when interaction saved, and error and interaction contains custom params, then custom params should include error and interaction params, and error params should override interaction params", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const customParams = {
      "overriddenParam": faker.datatype.uuid(),
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, customParams);

    interaction.root.attrs.custom = {
      "overriddenParam": faker.datatype.uuid(),
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        browserInteractionId: interaction.root.attrs.id
      }),
      expect.any(Object),
      expect.objectContaining({
        ...interaction.root.attrs.custom,
        ...customParams
      })
    );
  });

  test("given an error, when interaction discarded, and error and interaction contains custom params, then custom params should include interaction params, and error params should override interaction params", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const customParams = {
      "overriddenParam": faker.datatype.uuid(),
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, customParams);

    interaction.root.attrs.custom = {
      "overriddenParam": faker.datatype.uuid(),
      [faker.lorem.word()]: faker.datatype.uuid()
    }
    const interactionDiscardedFn = jest.mocked(eventEmitter.on).mock.calls[1][1];
    interactionDiscardedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        _interactionNodeId: undefined
      }),
      expect.any(Object),
      expect.objectContaining({
        ...interaction.root.attrs.custom,
        ...customParams
      })
    );
  });

  test("given an error, when interaction saved, and error and interaction contains custom object param, then object param should be stringified", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const customParams = {
      "errorParamA": {
        [faker.datatype.uuid()]: faker.datatype.uuid()
      }
    }
    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, customParams);

    interaction.root.attrs.custom = {
      "errorParamB": {
        [faker.datatype.uuid()]: faker.datatype.uuid()
      },
      "errorParamD": {
        "foo": "bar"
      }
    }
    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        browserInteractionId: interaction.root.attrs.id
      }),
      expect.any(Object),
      expect.objectContaining({
        "errorParamA": JSON.stringify(customParams.errorParamA),
        "errorParamB": JSON.stringify(interaction.root.attrs.custom.errorParamB)
      })
    );
  });

  test("given an error, when interaction discarded, and error and interaction contains custom object param, then object param should be stringified", () => {
    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const customParams = {
      "errorParamA": {
        [faker.datatype.uuid()]: faker.datatype.uuid()
      }
    }
    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, customParams);

    interaction.root.attrs.custom = {
      "errorParamB": {
        [faker.datatype.uuid()]: faker.datatype.uuid()
      },
      "errorParamD": {
        "foo": "bar"
      }
    }
    const interactionDiscardedFn = jest.mocked(eventEmitter.on).mock.calls[1][1];
    interactionDiscardedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        _interactionNodeId: undefined
      }),
      expect.any(Object),
      expect.objectContaining({
        "errorParamA": JSON.stringify(customParams.errorParamA),
        "errorParamB": JSON.stringify(interaction.root.attrs.custom.errorParamB)
      })
    );
  });

  test("given an error, when interaction saved, and interaction contains a parent node id, then error should be stored in the aggregator", () => {
    const interactionNodeId = faker.datatype.number();
    jest.mocked(handleFn).mockImplementation((_, errArr) => {
      errArr[2]._interactionId = interaction.id;
      errArr[2]._interactionNodeId = interactionNodeId;
    });

    new (require("./index").Aggregate)(agentIdentifier, aggregator);

    const storeErrorFn = jest.mocked(registerFn).mock.calls[0][1];
    storeErrorFn({}, Date.now(), false, {});

    const interactionSavedFn = jest.mocked(eventEmitter.on).mock.calls[0][1];
    interactionSavedFn(interaction);

    expect(aggregator.store).toHaveBeenCalledTimes(1);
    expect(aggregator.store).toHaveBeenCalledWith(
      "err",
      expect.any(String),
      expect.objectContaining({
        _interactionId: undefined,
        _interactionNodeId: undefined,
        browserInteractionId: interaction.root.attrs.id,
        parentNodeId: interactionNodeId.toString()
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });

});
