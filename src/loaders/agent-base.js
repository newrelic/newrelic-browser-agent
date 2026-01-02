/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable n/handle-callback-err */

import { generateRandomHexString } from '../common/ids/unique-id'
import { ApiBase } from './api-base'

/**
 * @typedef {import('./api/interaction-types').InteractionInstance} InteractionInstance
 */

export class AgentBase extends ApiBase {
  agentIdentifier = generateRandomHexString(16)
}
