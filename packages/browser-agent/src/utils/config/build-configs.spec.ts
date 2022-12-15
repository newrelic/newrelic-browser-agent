/**
 * @jest-environment jsdom
 */

import { NrOptions } from '../../types';
import { buildConfigs } from './build-configs'

const optsInfo = {
    beacon: 'beacon',
    errorBeacon: 'errorBeacon',
    licenseKey: 'licenseKey',
    applicationID: 'applicationID',
    sa: 1,
    queueTime: 1,
    applicationTime: 1,
    ttGuid: 'ttGuid',
    user: 'user',
    account: 'account',
    product: 'product',
    extra: 'extra',
    userAttributes: 'userAttributes',
    atts: 'atts',
    transactionName: 'transactionName',
    tNamePlain: 'tNamePlain',
}
const optsConfig = {
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ['bam-cell.nr-data.net'] },
    distributed_tracing: {
        enabled: true,
        exclude_newrelic_header: true,
        cors_use_newrelic_header: true,
        cors_use_tracecontext_headers: true,
        allowed_origins: ['bam-cell.nr-data.net']
    },
    page_view_timing: { enabled: true },
    ssl: true,
    obfuscate: [{ regex: /test/g, replacement: 'test' }],
}
const optsLoaderConfig = {
    accountID: 'accountID',
    trustKey: 'trustKey',
    agentID: 'agentID',
    xpid: 'xpid',
    licenseKey: 'licenseKey',
    applicationID: 'applicationID',
}
const opts: NrOptions | any = {
    ...optsInfo,
    ...optsConfig,
    ...optsLoaderConfig
}

describe('nr interface', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should build config objects from valid items', async () => {
        const {info, config, loader_config} = buildConfigs(opts)
        expect(info).toEqual(optsInfo)
        expect(config).toEqual(optsConfig)
        expect(loader_config).toEqual(optsLoaderConfig)
    })

    it('should not inject invalid properties', async () => {
        const {info, config, loader_config} = buildConfigs({...opts, invalidProperty: 'invalidProperty'})
        expect(info).not.toHaveProperty('invalidProperty')
        expect(config).not.toHaveProperty('invalidProperty')
        expect(loader_config).not.toHaveProperty('invalidProperty')
    })

    it('should warn if required props are not supplied', async () => {
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        // @ts-expect-error
        buildConfigs({...optsConfig})
        expect(spy).toHaveBeenCalled()
    })

    it('should not warn if required props are supplied', async () => {
        buildConfigs(opts)
        const spy = jest.spyOn(console, 'warn').mockImplementation()
        expect(spy).not.toHaveBeenCalled()
    })
})