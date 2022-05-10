/**
 * @jest-environment jsdom
 */

import { NrFeatures } from '../../types';
import { Api } from '../api/api';
import { initializeFeatures } from './initialize'
import {setInfo, setConfiguration, setLoaderConfig, setRuntime} from '@newrelic/browser-agent-core/common/config/config'

const id = '1234'
describe('nr interface', () => {
    beforeEach(() => {
        jest.resetModules()
        jest.resetAllMocks()
        setInfo(id, { applicationID: 1 })
        setConfiguration(id, {})
        setLoaderConfig(id, {})
        setRuntime(id, { maxBytes: 30000 })
    });

    it('should import modules in enabledFeatures', async () => {
        const {Features} = await import('./features')
        const {Aggregate} = await import('@newrelic/browser-agent-core/features/js-errors/aggregate')
        jest.mock('@newrelic/browser-agent-core/features/js-errors/aggregate')
        jest.mock('@newrelic/browser-agent-core/features/js-errors/instrument')
        const aggregator = jest.mock('@newrelic/browser-agent-core/common/aggregate/aggregator', () => {})
        const initializedFeatures = await initializeFeatures('1234', new Api(id), aggregator, new Features())
        expect(Aggregate).toHaveBeenCalled()
        expect(initializedFeatures).toContain(NrFeatures.JSERRORS)
    })

    it('should import nothing if no modules in enabledFeatures', async () => {
        const {Features} = await import('./features')
        const features = new Features()
        features.errors.enabled = false
        features.errors.auto = false
        const {Aggregate} = await import('@newrelic/browser-agent-core/features/js-errors/aggregate')
        jest.mock('@newrelic/browser-agent-core/features/js-errors/aggregate')
        jest.mock('@newrelic/browser-agent-core/features/js-errors/instrument')
        const aggregator = jest.mock('@newrelic/browser-agent-core/common/aggregate/aggregator', () => {})
        const initializedFeatures = await initializeFeatures('1234', new Api(id), aggregator, features)
        expect(Aggregate).not.toHaveBeenCalled()
        expect(initializedFeatures).not.toContain(NrFeatures.JSERRORS)
    })
})