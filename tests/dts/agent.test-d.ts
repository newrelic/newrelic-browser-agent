import { Agent } from '../../dist/types/loaders/agent'
import { AgentBase } from '../../dist/types/loaders/agent-base'
import { expectAssignable } from 'tsd'

const agent = new Agent({})
expectAssignable<AgentBase>(agent)
