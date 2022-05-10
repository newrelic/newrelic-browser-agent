import { NrOptions, NrInfo, NrConfig, NrLoaderConfig } from '../../types'

export function buildConfigs(options: NrOptions): { info: NrInfo, config: NrConfig, loader_config: NrLoaderConfig } {
  const info: NrInfo = {
    beacon: '',
    errorBeacon: undefined,
    licenseKey: '',
    applicationID: '',
    sa: undefined,
    queueTime: undefined,
    applicationTime: undefined,
    ttGuid: undefined,
    user: undefined,
    account: undefined,
    product: undefined,
    extra: undefined,
    userAttributes: undefined,
    atts: undefined,
    transactionName: undefined,
    tNamePlain: undefined
  }

  const config: NrConfig = {
    privacy: { cookies_enabled: undefined },
    ajax: { deny_list: undefined },
    distributed_tracing: {
      enabled: undefined,
      exclude_newrelic_header: undefined,
      cors_use_newrelic_header: undefined,
      cors_use_tracecontext_headers: undefined,
      allowed_origins: undefined
    },
    page_view_timing: { enabled: undefined },
    ssl: undefined,
    obfuscate: undefined
  }

  const loader_config: NrLoaderConfig = {
    accountID: undefined,
    trustKey: undefined,
    agentID: undefined,
    licenseKey: '',
    applicationID: '',
    xpid: undefined
  }

  Object.keys(options).forEach(key => {
    if (key === 'beacon') {
      info.beacon = options[key]
      info.errorBeacon = options[key]
    }
    if (Object.keys(info).includes(key)) info[key] = options[key]
    if (Object.keys(config).includes(key)) config[key] = options[key]
    if (Object.keys(loader_config).includes(key)) loader_config[key] = options[key]
  })

  if (!validateInfo(info) || !validateLoaderConfig(loader_config)) console.warn("Missing required config data")
  return { info, config, loader_config }
}

function validateInfo(info: NrInfo): boolean {
  return !(!info.applicationID || !info.licenseKey || !info.beacon)
}

function validateLoaderConfig(loader_config: NrLoaderConfig): boolean {
  return !(!loader_config.applicationID || !loader_config.licenseKey)
}