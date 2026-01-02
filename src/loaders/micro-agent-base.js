/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateRandomHexString } from '../common/ids/unique-id'
import { ApiBase } from './api-base'

export class MicroAgentBase extends ApiBase {
  agentIdentifier = generateRandomHexString(16)
}
