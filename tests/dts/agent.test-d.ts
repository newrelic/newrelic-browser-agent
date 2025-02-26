import { Agent } from '../../dist/types/loaders/agent'
import { AgentBase } from '../../dist/types/loaders/agent-base'
import { expectAssignable, expectError } from 'tsd'

const validOptions = {
  info: {
    applicationID: '12345',
    licenseKey: 'abcde'
  }
}

const agent = new Agent(validOptions)
expectAssignable<AgentBase>(agent)

expectError<AgentBase>(new Agent()) // must pass AgentOptions into constructor
