/**
 * @jest-environment jsdom
 */
declare var window: any
import { NrFeatures, NrOptions } from './types';
import { Features } from './utils/features/features';

let config: NrOptions | any = {
    applicationID: 'applicationID',
    beacon: 'beacon',
    licenseKey: 'licenseKey',
    obfuscate: [{ regex: /test/g, replacement: 'test' }]
}

describe('nr interface', () => {
    beforeEach(() => {
        jest.resetModules()
        jest.resetAllMocks()
        delete window.NREUM
    });

    it('should set internal config values on start()', async () => {
        const { default: NR } = await import('./index')
        const nr = new NR()
        const opts = { ...config }
        await nr.start(opts)
        expect(nr.config.info).toHaveProperty('licenseKey')
        expect(nr.config.info).toHaveProperty('applicationID')
        expect(nr.config.info).toHaveProperty('beacon')
        expect(nr.config.config).toHaveProperty('obfuscate')
        expect(nr.config.loader_config).toHaveProperty('licenseKey')
        expect(nr.config.loader_config).toHaveProperty('applicationID')
    })

    it('should not set invalid internal config values', async () => {

        const { default: NR } = await import('./index')
        const nr = new NR()
        const opts = { ...config, invalidProperty: 'invalid' }
        await nr.start(opts)
        expect(nr.config.info).not.toHaveProperty('invalidProperty')
    })

    it('should early return if already initialized', async () => {

        const { default: NR } = await import('./index')
        const nr = new NR()
        const opts = { ...config }
        const opts2 = { ...config, applicationID: 'applicationID2' }
        expect(await nr.start(opts)).toBeTruthy()
        expect(nr.initialized).toBeTruthy()
        expect(await nr.start(opts2)).toBeFalsy()
        expect(nr.initialized).toBeTruthy()
        expect(nr.config.info.applicationID).not.toEqual('applicationID2')
    })

    it('should use real noticeError if initialized', async () => {
        const { default: NR } = await import('./index')
        const nr = new NR()
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        const opts = { ...config }
        await nr.start(opts)
        nr.noticeError('test')
        expect(spy).not.toHaveBeenCalled()
    })

    it('should use warning noticeError if not initialized', async () => {

        const { default: NR } = await import('./index')
        const nr = new NR()
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        nr.noticeError('test')
        expect(spy).toHaveBeenCalled()
    })

    it('should store initialized features in window.NREUM', async () => {

        const { default: NR } = await import('./index')
        const nr = new NR()
        const opts = { ...config }
        await nr.start(opts)

        const { initializedAgents } = window.NREUM
        Object.values(initializedAgents).forEach((x: any) => {
            expect(x.features).toContain(NrFeatures.JSERRORS)
        })
    })

    it('should not store disabled features in window.NREUM', async () => {

        const { default: NR } = await import('./index')
        const nr = new NR()
        const opts = { ...config }
        nr.features.errors.enabled = false
        await nr.start(opts)

        const { initializedAgents } = window.NREUM
        Object.values(initializedAgents).forEach((x: any) => {
            expect(x.features).not.toContain(NrFeatures.JSERRORS)
        })
    })
})