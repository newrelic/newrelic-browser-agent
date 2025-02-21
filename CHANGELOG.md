# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.283.2](https://github.com/newrelic/newrelic-browser-agent/compare/v1.283.1...v1.283.2) (2025-02-21)


### Bug Fixes

* Add logging analytic metrics and fix browser performance metrics ([#1392](https://github.com/newrelic/newrelic-browser-agent/issues/1392)) ([00cfd66](https://github.com/newrelic/newrelic-browser-agent/commit/00cfd661ad24ec2faa885fcab1df61912163ef13))

## [1.283.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.283.0...v1.283.1) (2025-02-19)


### Bug Fixes

* Removing websocket wrapping & SM ([#1388](https://github.com/newrelic/newrelic-browser-agent/issues/1388)) ([95bbe92](https://github.com/newrelic/newrelic-browser-agent/commit/95bbe92f12d20447b40538b17db61c2ea887ef79))

## [1.283.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.282.0...v1.283.0) (2025-02-18)


### Features

* Add auto-logging feature ([#1274](https://github.com/newrelic/newrelic-browser-agent/issues/1274)) ([91204ae](https://github.com/newrelic/newrelic-browser-agent/commit/91204ae0099508d13c944be06ed6c46dce901ce3))
* Add global custom attributes to log data ([#1343](https://github.com/newrelic/newrelic-browser-agent/issues/1343)) ([dc7d27c](https://github.com/newrelic/newrelic-browser-agent/commit/dc7d27c718c13a54bce5cc1fa6b0260b95008637))

## [1.282.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.281.0...v1.282.0) (2025-02-13)


### Features

* Re-implement wrap-websocket into agent ([#1342](https://github.com/newrelic/newrelic-browser-agent/issues/1342)) ([9b2756f](https://github.com/newrelic/newrelic-browser-agent/commit/9b2756f520cb946192e72d138e14fb4fca75a7b8))

## [1.281.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.280.0...v1.281.0) (2025-02-04)


### Features

* Capture Nearest UserAction Fields ([#1267](https://github.com/newrelic/newrelic-browser-agent/issues/1267)) ([d410937](https://github.com/newrelic/newrelic-browser-agent/commit/d410937983545a6a6aa39c52c3762f621acf1110))

## [1.280.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.279.1...v1.280.0) (2025-01-31)


### Features

* Remove agentIdentifier argument from agent constructors ([#1353](https://github.com/newrelic/newrelic-browser-agent/issues/1353)) ([cb866e5](https://github.com/newrelic/newrelic-browser-agent/commit/cb866e5678bf6aa898c082f2be83145a5014fd0e))


### Bug Fixes

* Roll back to previous FirstInteraction implementation ([#1359](https://github.com/newrelic/newrelic-browser-agent/issues/1359)) ([c2e22ab](https://github.com/newrelic/newrelic-browser-agent/commit/c2e22ab49b00e9cfbeb54664a820e1aa4ed28a53))

## [1.279.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.279.0...v1.279.1) (2025-01-28)


### Bug Fixes

* CLS timing node not being reported post new Harvester ([#1352](https://github.com/newrelic/newrelic-browser-agent/issues/1352)) ([5db1d97](https://github.com/newrelic/newrelic-browser-agent/commit/5db1d97a147c78bf93dee669ff9da95bb560d1db))

## [1.279.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.278.3...v1.279.0) (2025-01-24)


### Features

* Add HTTP codes for harvest retry attempts ([#1331](https://github.com/newrelic/newrelic-browser-agent/issues/1331)) ([7c309f7](https://github.com/newrelic/newrelic-browser-agent/commit/7c309f780ce32e1787d66fb22a6a9313f2466b31))
* Capture details in marks and measures ([#1332](https://github.com/newrelic/newrelic-browser-agent/issues/1332)) ([32a6b56](https://github.com/newrelic/newrelic-browser-agent/commit/32a6b56d5db0ffc6c2157718ee72ca62695ee258))
* debounce window user actions ([#1326](https://github.com/newrelic/newrelic-browser-agent/issues/1326)) ([dec8f2d](https://github.com/newrelic/newrelic-browser-agent/commit/dec8f2d07e9e521e08647bd281457292312b56c0))
* Remove FID ([#1319](https://github.com/newrelic/newrelic-browser-agent/issues/1319)) ([0f32b99](https://github.com/newrelic/newrelic-browser-agent/commit/0f32b993a77e747f9724b6ba363e94730a6c8b3f))

## [1.278.3](https://github.com/newrelic/newrelic-browser-agent/compare/v1.278.2...v1.278.3) (2025-01-14)


### Bug Fixes

* Change obfuscator to read directly from obfuscation rules configuration ([#1327](https://github.com/newrelic/newrelic-browser-agent/issues/1327)) ([a75f935](https://github.com/newrelic/newrelic-browser-agent/commit/a75f935d9b045ac74878f7dd1fab04d046b376dc))

## [1.278.2](https://github.com/newrelic/newrelic-browser-agent/compare/v1.278.1...v1.278.2) (2025-01-09)


### Bug Fixes

* Allow the page view feature to have access to an event buffer ([#1315](https://github.com/newrelic/newrelic-browser-agent/issues/1315)) ([64babe1](https://github.com/newrelic/newrelic-browser-agent/commit/64babe18a5c4190f6d7bdc775fe5f55db095c892))

## [1.278.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.278.0...v1.278.1) (2025-01-08)


### Bug Fixes

* Make Metrics harvest only on EoL for new Harvester ([#1311](https://github.com/newrelic/newrelic-browser-agent/issues/1311)) ([5cecedc](https://github.com/newrelic/newrelic-browser-agent/commit/5cecedcad6af7a14ec0e6777eba059ff1a5c008d))

## [1.278.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.277.0...v1.278.0) (2025-01-07)


### Features

* Centralized harvesting ([#1298](https://github.com/newrelic/newrelic-browser-agent/issues/1298)) ([32c0e3f](https://github.com/newrelic/newrelic-browser-agent/commit/32c0e3f7008423a3e327d17b926d1702d08ae21f))

## [1.277.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.276.0...v1.277.0) (2024-12-18)


### Features

* Add custom events API ([#1263](https://github.com/newrelic/newrelic-browser-agent/issues/1263)) ([9395415](https://github.com/newrelic/newrelic-browser-agent/commit/9395415d942b55e88e89438aa203c6a1642d9e6b))


### Bug Fixes

* Soft navigation bug fixes and new soft navigation tests ([#1268](https://github.com/newrelic/newrelic-browser-agent/issues/1268)) ([7624928](https://github.com/newrelic/newrelic-browser-agent/commit/762492896a7b96564269aab1aadeb6e44a4da242))

## [1.276.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.275.0...v1.276.0) (2024-12-16)


### Features

* allow feature flags to control experimental features ([#1282](https://github.com/newrelic/newrelic-browser-agent/issues/1282)) ([537e72d](https://github.com/newrelic/newrelic-browser-agent/commit/537e72da0821792006abd16c41ffa025fd73b474))
* Capture Page Resource Assets ([#1257](https://github.com/newrelic/newrelic-browser-agent/issues/1257)) ([e4c7deb](https://github.com/newrelic/newrelic-browser-agent/commit/e4c7debe2a1653efdad8940c55a71dd0140ce900))


### Bug Fixes

* Fix syntax error in fallback when tracking xhr readyState ([#1272](https://github.com/newrelic/newrelic-browser-agent/issues/1272)) ([2bb6b5b](https://github.com/newrelic/newrelic-browser-agent/commit/2bb6b5b2e104a6b3ac9ceb70d396f65cfb61c1bd))
* Ignore reserved attribute names on UserActions tied to the window ([#1261](https://github.com/newrelic/newrelic-browser-agent/issues/1261)) ([8410dbe](https://github.com/newrelic/newrelic-browser-agent/commit/8410dbeef30aeb0e578c63a293ec311c3d42f8da))

## [1.275.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.274.0...v1.275.0) (2024-12-03)


### Features

* Allow logs api wrapper to update custom attributes ([#1265](https://github.com/newrelic/newrelic-browser-agent/issues/1265)) ([8d10e14](https://github.com/newrelic/newrelic-browser-agent/commit/8d10e14953f9a5b9ba97e865ba5476fc527ba384))
* Enable the browser agent to run in extension background contexts ([#1206](https://github.com/newrelic/newrelic-browser-agent/issues/1206)) ([37e976b](https://github.com/newrelic/newrelic-browser-agent/commit/37e976bf360c209efd163855e7fbe84d665e444b))


### Bug Fixes

* Harvest generic events when max size is reached ([#1250](https://github.com/newrelic/newrelic-browser-agent/issues/1250)) ([e00a469](https://github.com/newrelic/newrelic-browser-agent/commit/e00a46975bcc93c48798bd9153f3a503998b0915))

## [1.274.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.273.1...v1.274.0) (2024-11-19)


### Features

* Upgrade SessionReplay libraries to latest version ([#1251](https://github.com/newrelic/newrelic-browser-agent/issues/1251)) ([2d8d114](https://github.com/newrelic/newrelic-browser-agent/commit/2d8d114e70ba2861fb5639e132f25c9c03df871b))

## [1.273.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.273.0...v1.273.1) (2024-11-18)


### Bug Fixes

* Multiple MicroAgent undefined session and limit available API ([#1252](https://github.com/newrelic/newrelic-browser-agent/issues/1252)) ([19cbb63](https://github.com/newrelic/newrelic-browser-agent/commit/19cbb634b5016e3e8ce0c40a6bf1ee59156c78eb))

## [1.273.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.272.0...v1.273.0) (2024-11-11)


### Features

* Refactor feature storages ([#1241](https://github.com/newrelic/newrelic-browser-agent/issues/1241)) ([f77380b](https://github.com/newrelic/newrelic-browser-agent/commit/f77380b01e9b57db0b5c782d6d512431229bcd79))
* Remove wrap-events usage from soft nav ([#1244](https://github.com/newrelic/newrelic-browser-agent/issues/1244)) ([911d8d1](https://github.com/newrelic/newrelic-browser-agent/commit/911d8d1d78b49fa4252257596e013806885ace9b))

## [1.272.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.271.0...v1.272.0) (2024-11-07)


### Features

* Marks and measures ([#1189](https://github.com/newrelic/newrelic-browser-agent/issues/1189)) ([1a58409](https://github.com/newrelic/newrelic-browser-agent/commit/1a58409cda8b7b264e58fe284041540941dccd1c))

## [1.271.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.270.3...v1.271.0) (2024-11-01)


### Features

* Ignore unhandled promise rejections that lack a valid reason ([#1233](https://github.com/newrelic/newrelic-browser-agent/issues/1233)) ([25a1fff](https://github.com/newrelic/newrelic-browser-agent/commit/25a1fffb91fa5936766a7bc89d735b3018aa62a2))

## [1.270.3](https://github.com/newrelic/newrelic-browser-agent/compare/v1.270.2...v1.270.3) (2024-10-31)


### Bug Fixes

* Ensure all lazy loaded modules issue warning instead of errors ([#1234](https://github.com/newrelic/newrelic-browser-agent/issues/1234)) ([cdfdab7](https://github.com/newrelic/newrelic-browser-agent/commit/cdfdab701bda6266416ad27750e63e8e9e0e075b))

## [1.270.2](https://github.com/newrelic/newrelic-browser-agent/compare/v1.270.1...v1.270.2) (2024-10-28)


### Bug Fixes

* Correct naming for logging pageUrl attribute ([#1225](https://github.com/newrelic/newrelic-browser-agent/issues/1225)) ([95f5a77](https://github.com/newrelic/newrelic-browser-agent/commit/95f5a77c60221c0eda61a42f33648f5a2791891f))

## [1.270.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.270.0...v1.270.1) (2024-10-23)


### Bug Fixes

* Remove undefined agentRuntime in Session Trace ([#1227](https://github.com/newrelic/newrelic-browser-agent/issues/1227)) ([dc5938f](https://github.com/newrelic/newrelic-browser-agent/commit/dc5938f26e43686759de976d4631b22f112b71e8))

## [1.270.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.269.0...v1.270.0) (2024-10-22)


### Features

* Add Firefox to LCP test matcher ([#1223](https://github.com/newrelic/newrelic-browser-agent/issues/1223)) ([c6a20e1](https://github.com/newrelic/newrelic-browser-agent/commit/c6a20e11b694fcf721ce27b02be1df76caed1a3e))
* Move deregisterDrain method to feature-base ([#1220](https://github.com/newrelic/newrelic-browser-agent/issues/1220)) ([5fdea14](https://github.com/newrelic/newrelic-browser-agent/commit/5fdea14097d415d7c6f3f98bfe87848e118ec62e))
* Relocate aggregator from loader and improve agent internals ([#1216](https://github.com/newrelic/newrelic-browser-agent/issues/1216)) ([789df5a](https://github.com/newrelic/newrelic-browser-agent/commit/789df5a0d5574acb02ac0db2aea98150a9c8786e))
* Remove 'pageHide' from page end-of-lifecycle listener ([#1219](https://github.com/newrelic/newrelic-browser-agent/issues/1219)) ([daf349e](https://github.com/newrelic/newrelic-browser-agent/commit/daf349e632902597c232c3392cc5d188f2995f25))
* Remove supportsSendBeacon runtime property ([#1224](https://github.com/newrelic/newrelic-browser-agent/issues/1224)) ([a5996be](https://github.com/newrelic/newrelic-browser-agent/commit/a5996bec25f7c4038ce87f2ad72eb61d637f5994))

## [1.269.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.268.0...v1.269.0) (2024-10-16)


### Features

* Add instrumentation metadata to logging ([#1208](https://github.com/newrelic/newrelic-browser-agent/issues/1208)) ([6926474](https://github.com/newrelic/newrelic-browser-agent/commit/6926474fe2530475e10daab2bb6bad745bb547e1))
* Include logging feature in micro agent loader ([#1210](https://github.com/newrelic/newrelic-browser-agent/issues/1210)) ([1b24484](https://github.com/newrelic/newrelic-browser-agent/commit/1b2448498cf285f36530f2107cb0403401958b1f))


### Bug Fixes

* Handle Session Replay Security Policy Errors ([#1215](https://github.com/newrelic/newrelic-browser-agent/issues/1215)) ([f14b0fe](https://github.com/newrelic/newrelic-browser-agent/commit/f14b0fec81d7d21b418b6be6c5d415bdd813eca9))
* Only ever allow session traces to capture page load timings once ([#1212](https://github.com/newrelic/newrelic-browser-agent/issues/1212)) ([d189686](https://github.com/newrelic/newrelic-browser-agent/commit/d1896869858eca3320144113e168f17f524f3119))

## [1.268.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.267.0...v1.268.0) (2024-10-08)


### Features

* Add UserAction to GenericEvents ([#1186](https://github.com/newrelic/newrelic-browser-agent/issues/1186)) ([1b0bb1d](https://github.com/newrelic/newrelic-browser-agent/commit/1b0bb1dd992674f77c41a73449b64b022cdfc83c))
* Aggregate UserActions ([#1195](https://github.com/newrelic/newrelic-browser-agent/issues/1195)) ([b5e4c6d](https://github.com/newrelic/newrelic-browser-agent/commit/b5e4c6dcdcfce3ab88132f2a1d82d4d02ab7640b))


### Bug Fixes

* Always return a string for custom stringify method ([#1207](https://github.com/newrelic/newrelic-browser-agent/issues/1207)) ([94a9a0b](https://github.com/newrelic/newrelic-browser-agent/commit/94a9a0b465e9ea34132317236d47ac9f62ee4051))
* Force generic events feature to clear buffer when unloading ([#1202](https://github.com/newrelic/newrelic-browser-agent/issues/1202)) ([d3fac07](https://github.com/newrelic/newrelic-browser-agent/commit/d3fac07379d18c98e9838152a31a482ff25fe5bf))

## [1.267.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.266.0...v1.267.0) (2024-09-23)


### Features

* add soft navigations to Browser-Agent loader ([#1191](https://github.com/newrelic/newrelic-browser-agent/issues/1191)) ([fd033a7](https://github.com/newrelic/newrelic-browser-agent/commit/fd033a7be52fed01e5a67a5f8060cf6ec080c769))
* Improve notifications of stylesheet status for session replay ([#1190](https://github.com/newrelic/newrelic-browser-agent/issues/1190)) ([a21b939](https://github.com/newrelic/newrelic-browser-agent/commit/a21b939884697fc4951e6d4cdaceecaa9b000810))
* Update TimeKeeper Source of Truth ([#1181](https://github.com/newrelic/newrelic-browser-agent/issues/1181)) ([60d63cf](https://github.com/newrelic/newrelic-browser-agent/commit/60d63cf416529d700abaa6fa36ba3e64402b35a9))
* Upgrade to web-vitals v4 ([#1193](https://github.com/newrelic/newrelic-browser-agent/issues/1193)) ([81349b8](https://github.com/newrelic/newrelic-browser-agent/commit/81349b82f5befd88f425cce1dee06f08fcea8a05))

### Bug Fixes

* Improve reliability of customMasker ([#1197](https://github.com/newrelic/newrelic-browser-agent/issues/1197)) ([9f2ef1f](https://github.com/newrelic/newrelic-browser-agent/commit/9f2ef1f7d0e5dceaf61745a47849a3b2cc930c53))
* Stringify now returns an empty string if failed to transform ([#1198](https://github.com/newrelic/newrelic-browser-agent/issues/1198)) ([310937a](https://github.com/newrelic/newrelic-browser-agent/commit/310937ae20a004f91f3ccb4ba6b1d1b230d92632))

## [1.266.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.265.1...v1.266.0) (2024-09-16)


### Features

* Removing long task ([#1153](https://github.com/newrelic/newrelic-browser-agent/issues/1153)) ([304e395](https://github.com/newrelic/newrelic-browser-agent/commit/304e3954df9639d6d61e545fcaa0c761346a5016))


### Bug Fixes

* Remove nullish coalescing inside getter ([#1180](https://github.com/newrelic/newrelic-browser-agent/issues/1180)) ([e537359](https://github.com/newrelic/newrelic-browser-agent/commit/e537359f354270fcbd607445b6853c236f0fdbfc))

## [1.265.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.265.0...v1.265.1) (2024-09-06)


### Bug Fixes

* Disable websocket wrapping ([#1176](https://github.com/newrelic/newrelic-browser-agent/issues/1176)) ([5f8a0c4](https://github.com/newrelic/newrelic-browser-agent/commit/5f8a0c42fbade8f6f81471439ecc8999b1556290))

## [1.265.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.264.0...v1.265.0) (2024-08-30)


### Features

* add payload size evaluation to generic events feature ([#1152](https://github.com/newrelic/newrelic-browser-agent/issues/1152)) ([65d9d11](https://github.com/newrelic/newrelic-browser-agent/commit/65d9d11172df4a3abe750c3d110b53ad65ae4319))
* Add WebSocket wrapper and supportability metrics ([#1159](https://github.com/newrelic/newrelic-browser-agent/issues/1159)) ([7b4ab87](https://github.com/newrelic/newrelic-browser-agent/commit/7b4ab87ae28450cc97f6a84f3176e0c9f8698d76))
* Configure Session Replay to wait for DOMContentLoaded ([#1164](https://github.com/newrelic/newrelic-browser-agent/issues/1164)) ([84bd299](https://github.com/newrelic/newrelic-browser-agent/commit/84bd29981675660d8f47a0f49235005e7be11947))
* removing internal barrel exports ([#1158](https://github.com/newrelic/newrelic-browser-agent/issues/1158)) ([2e29a6e](https://github.com/newrelic/newrelic-browser-agent/commit/2e29a6e3c9d7a6a099b73aff59682a1e38008072))
* Standardize Feature Buffering Behavior ([#1155](https://github.com/newrelic/newrelic-browser-agent/issues/1155)) ([d070a43](https://github.com/newrelic/newrelic-browser-agent/commit/d070a4315df35ace82e20b8b2c69044bf8504c92))


### Bug Fixes

* Ensure drain target is a valid event emitter before subscribing ([#1167](https://github.com/newrelic/newrelic-browser-agent/issues/1167)) ([187d31f](https://github.com/newrelic/newrelic-browser-agent/commit/187d31fe0fd95e75907742a7c49779683a6b040c))
* fix duplicative log payloads on unload ([#1166](https://github.com/newrelic/newrelic-browser-agent/issues/1166)) ([52bb088](https://github.com/newrelic/newrelic-browser-agent/commit/52bb08880215c40abf080a2bf1c80a29c7ad3324))
* relative timestamps in session trace ([#1142](https://github.com/newrelic/newrelic-browser-agent/issues/1142)) ([378b1fb](https://github.com/newrelic/newrelic-browser-agent/commit/378b1fb49ca5732e0c1b704920143b966102cfb6))
* Updated Logging API function ([#1147](https://github.com/newrelic/newrelic-browser-agent/issues/1147)) ([bf2e980](https://github.com/newrelic/newrelic-browser-agent/commit/bf2e98056c2ad214421918fb4938a08b6213590e))


### Security Fixes

* apply obfuscation rules to session trace ([#1149](https://github.com/newrelic/newrelic-browser-agent/issues/1149)) ([fbc6f9d](https://github.com/newrelic/newrelic-browser-agent/commit/fbc6f9d31a33515e05d70e190c9c8da198fa4415))

## [1.264.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.263.0...v1.264.0) (2024-08-06)


### Features

* Create generic events feature with 1,000 event limit ([#1121](https://github.com/newrelic/newrelic-browser-agent/issues/1121)) ([63ab04f](https://github.com/newrelic/newrelic-browser-agent/commit/63ab04fa9b2a0c347e175c9174f563e73767933b))
* Report Page Actions with Generic Events Feature ([#1124](https://github.com/newrelic/newrelic-browser-agent/issues/1124)) ([0d52acf](https://github.com/newrelic/newrelic-browser-agent/commit/0d52acf9eaa9a2c170459f03e9edad25375f4c1c))

## [1.263.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.262.0...v1.263.0) (2024-07-25)


### Features

* Optimize bundle size with warning codes ([#1111](https://github.com/newrelic/newrelic-browser-agent/issues/1111)) ([6ab7d2b](https://github.com/newrelic/newrelic-browser-agent/commit/6ab7d2bee5053fc75c0d20c6257afea5cf16d76d))
* Shut down agent if improperly configured ([#1116](https://github.com/newrelic/newrelic-browser-agent/issues/1116)) ([edc20d4](https://github.com/newrelic/newrelic-browser-agent/commit/edc20d4f81d1c0662f3f244240cc968b1f3870c9))


### Bug Fixes

* Prevent agent using invalid date header ([#1122](https://github.com/newrelic/newrelic-browser-agent/issues/1122)) ([6851c1b](https://github.com/newrelic/newrelic-browser-agent/commit/6851c1b1733c513ab4de119e875593a418e51b93))

## [1.262.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.261.2...v1.262.0) (2024-07-09)


### Features

* logging bundle optimization ([#1089](https://github.com/newrelic/newrelic-browser-agent/issues/1089)) ([83d7d1e](https://github.com/newrelic/newrelic-browser-agent/commit/83d7d1ed1863772e5515d128d0710cb456dafafd))


### Bug Fixes

* address call to stopTimer on undefined scheduler ([#1104](https://github.com/newrelic/newrelic-browser-agent/issues/1104)) ([5022134](https://github.com/newrelic/newrelic-browser-agent/commit/5022134783152e7eebbd54608eda5a09e8fe0ebb))
* Release backlog memory when features are blocked by RUM ([#1102](https://github.com/newrelic/newrelic-browser-agent/issues/1102)) ([5eb9164](https://github.com/newrelic/newrelic-browser-agent/commit/5eb91646314b5a225a1a902ecb0b58b57b5ee74f))
* safeguard api calls ([#1103](https://github.com/newrelic/newrelic-browser-agent/issues/1103)) ([3d815a3](https://github.com/newrelic/newrelic-browser-agent/commit/3d815a3988583911322541007bd5e176a5bba4c1))

## [1.261.2](https://github.com/newrelic/newrelic-browser-agent/compare/v1.261.1...v1.261.2) (2024-07-01)


### Bug Fixes

* recordReplay will restart replays on same session page loads ([#1093](https://github.com/newrelic/newrelic-browser-agent/issues/1093)) ([cecddbe](https://github.com/newrelic/newrelic-browser-agent/commit/cecddbebc445dabcf3ce48c1fc88311198be6d0a))

## [1.261.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.261.0...v1.261.1) (2024-06-26)


### Bug Fixes

* Unhandled promise rejection for session import ([#1088](https://github.com/newrelic/newrelic-browser-agent/issues/1088)) ([03efcf3](https://github.com/newrelic/newrelic-browser-agent/commit/03efcf36656ac883c4431829fda1bad6445373a1))

## [1.261.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.260.1...v1.261.0) (2024-06-26)


### Features

* Add Logging API entry points and central handler ([#1052](https://github.com/newrelic/newrelic-browser-agent/issues/1052)) ([face445](https://github.com/newrelic/newrelic-browser-agent/commit/face4457f2ec29699b610cb096864ee3a16aafdc))
* Add Logging Configurations ([#1058](https://github.com/newrelic/newrelic-browser-agent/issues/1058)) ([3c4ea26](https://github.com/newrelic/newrelic-browser-agent/commit/3c4ea262b30b48afc434f8ccdce867b1a5acb874))
* Add wrapLogger API method for wrapping 3rd party loggers ([#1054](https://github.com/newrelic/newrelic-browser-agent/issues/1054)) ([3713d73](https://github.com/newrelic/newrelic-browser-agent/commit/3713d73716f24c9bfb4154a664c2696296f7150e))
* Create logging feature ([#1059](https://github.com/newrelic/newrelic-browser-agent/issues/1059)) ([c573e33](https://github.com/newrelic/newrelic-browser-agent/commit/c573e330ea5e7dd97e7293b0f95785cb738cf3f2))
* Logging feature harvesting and optimizations ([#1064](https://github.com/newrelic/newrelic-browser-agent/issues/1064)) ([9a9fad5](https://github.com/newrelic/newrelic-browser-agent/commit/9a9fad5fe10536e72d5b55374363f727b6ae0c43))
* Pass logging API args as object for better extensibility ([#1074](https://github.com/newrelic/newrelic-browser-agent/issues/1074)) ([8fbd25a](https://github.com/newrelic/newrelic-browser-agent/commit/8fbd25a6de3e5c48869f9cae564d86cf36cc364c))


### Bug Fixes

* dedup pre-load ajax requests ([#1081](https://github.com/newrelic/newrelic-browser-agent/issues/1081)) ([9f95b33](https://github.com/newrelic/newrelic-browser-agent/commit/9f95b339248d7597ce489546e9f04d68053fe7d1))
* Prevent session reset triggers from harvesting session trace data ([#1050](https://github.com/newrelic/newrelic-browser-agent/issues/1050)) ([bec022b](https://github.com/newrelic/newrelic-browser-agent/commit/bec022b57ffa2cb23353272b667727f631e76b63))
* Reading finish of null in SPA ([#1085](https://github.com/newrelic/newrelic-browser-agent/issues/1085)) ([df874f7](https://github.com/newrelic/newrelic-browser-agent/commit/df874f72c1a7668098c855eea718b1d0ceda7a7c))

## [1.260.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.260.0...v1.260.1) (2024-05-16)


### Bug Fixes

* Undefined stns in blob Trace ([#1039](https://github.com/newrelic/newrelic-browser-agent/issues/1039)) ([1a87991](https://github.com/newrelic/newrelic-browser-agent/commit/1a87991143aa1f220ae29edbf1e8ea89598bcc44))

## [1.260.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.259.0...v1.260.0) (2024-05-13)


### Features

* Improve time stamping of page view events ([#1026](https://github.com/newrelic/newrelic-browser-agent/issues/1026)) ([67a658d](https://github.com/newrelic/newrelic-browser-agent/commit/67a658d2645b680a479175dff06a4fd95bd6086a))


### Bug Fixes

* Add internal error handler to session replay recorder ([#1029](https://github.com/newrelic/newrelic-browser-agent/issues/1029)) ([84c101c](https://github.com/newrelic/newrelic-browser-agent/commit/84c101ccbff8da207bdf215714f49b7d49941388))
* Adjust session entity to not race between tabs ([#1032](https://github.com/newrelic/newrelic-browser-agent/issues/1032)) ([d86becf](https://github.com/newrelic/newrelic-browser-agent/commit/d86becf2fc02aa133430332aa4e4c2bc26297750))

## [1.259.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.258.2...v1.259.0) (2024-05-08)


### Features

* Migrate Session Traces to Use Blob Consumer with Feature Flags ([#821](https://github.com/newrelic/newrelic-browser-agent/issues/821)) ([55b0e00](https://github.com/newrelic/newrelic-browser-agent/commit/55b0e00e9d8dce6d0cdbed978a98302d40123f3d))

## [1.258.2](https://github.com/newrelic/newrelic-browser-agent/compare/v1.258.1...v1.258.2) (2024-05-07)


### Bug Fixes

* Prevent noticeError() API from running if not given an argument ([#1021](https://github.com/newrelic/newrelic-browser-agent/issues/1021)) ([c023a53](https://github.com/newrelic/newrelic-browser-agent/commit/c023a53c20a9f0f2472e1ba5ff78eb7210a906fa))

## [1.258.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.258.0...v1.258.1) (2024-05-07)


### Bug Fixes

* Exclude data url requests as captured AJAX events ([#1012](https://github.com/newrelic/newrelic-browser-agent/issues/1012)) ([2a3fa57](https://github.com/newrelic/newrelic-browser-agent/commit/2a3fa57da1f389e6eabae2c92686e25285fc6cd3))
* Improve Error Casting ([#1014](https://github.com/newrelic/newrelic-browser-agent/issues/1014)) ([d1dd20c](https://github.com/newrelic/newrelic-browser-agent/commit/d1dd20ce526ddb697962f695fbb5915410474987))
* Remove API start()'s features param ([#1009](https://github.com/newrelic/newrelic-browser-agent/issues/1009)) ([38a502b](https://github.com/newrelic/newrelic-browser-agent/commit/38a502b08b4735259e7f5b863b0e5e5361c075b6))
* Run inside cross-origin iframes for firefox/safari ([#1015](https://github.com/newrelic/newrelic-browser-agent/issues/1015)) ([6a4a73d](https://github.com/newrelic/newrelic-browser-agent/commit/6a4a73d72b056177268f8619a3a3b7810a7a2c79))
* Session trace nodes de-duplication ([#1008](https://github.com/newrelic/newrelic-browser-agent/issues/1008)) ([44f229e](https://github.com/newrelic/newrelic-browser-agent/commit/44f229e4d35cd468bfe29b1796be8031bb9c72ff))

## [1.258.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.257.0...v1.258.0) (2024-04-29)


### Features

* Add harvestId to Session Replay payloads ([#1002](https://github.com/newrelic/newrelic-browser-agent/issues/1002)) ([aea9ac4](https://github.com/newrelic/newrelic-browser-agent/commit/aea9ac4dc791c58badc6d2efe7bdbb3c0f51a8bb))
* JSErrors timestamped per harvest ([#997](https://github.com/newrelic/newrelic-browser-agent/issues/997)) ([97ae128](https://github.com/newrelic/newrelic-browser-agent/commit/97ae128934df7a74701eef001e49b0065ffe8216))
* Maintain calculated NR server time for session ([#980](https://github.com/newrelic/newrelic-browser-agent/issues/980)) ([c487e04](https://github.com/newrelic/newrelic-browser-agent/commit/c487e04f46a606545c8172b6ed1c022b4dc1cac1))
* Restructure AJAX Aggregate ([#1003](https://github.com/newrelic/newrelic-browser-agent/issues/1003)) ([1c3a6b9](https://github.com/newrelic/newrelic-browser-agent/commit/1c3a6b963c1eb7e0792225c3a4c15b6fd8d64505))


### Bug Fixes

* Clean up xhrWrappable ([#1000](https://github.com/newrelic/newrelic-browser-agent/issues/1000)) ([5e28fb7](https://github.com/newrelic/newrelic-browser-agent/commit/5e28fb722aa2bf08acc89066d5814e5bef862741))
* Prevent null CLS ([#993](https://github.com/newrelic/newrelic-browser-agent/issues/993)) ([a518039](https://github.com/newrelic/newrelic-browser-agent/commit/a518039aa61862553d546cf0e675b733a9f9bed7))

## [1.257.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.256.1...v1.257.0) (2024-04-18)


### Features

* Decorate errors with hasReplay individually ([#983](https://github.com/newrelic/newrelic-browser-agent/issues/983)) ([b6a7a3e](https://github.com/newrelic/newrelic-browser-agent/commit/b6a7a3ebcf2a69b9cbe9888208bb62330918cdf7))
* Session Replay preload optimizations ([#982](https://github.com/newrelic/newrelic-browser-agent/issues/982)) ([fa20693](https://github.com/newrelic/newrelic-browser-agent/commit/fa20693d746bed2fa0b8ff972e4b9bee4bbe6956))


### Bug Fixes

* Agent class type declarations ([#987](https://github.com/newrelic/newrelic-browser-agent/issues/987)) ([b682c88](https://github.com/newrelic/newrelic-browser-agent/commit/b682c880bfb149b61f6c00bf821459ea55a37ae8))
* JSEerrors harvest hasReplay decoration ([#986](https://github.com/newrelic/newrelic-browser-agent/issues/986)) ([6dd09c5](https://github.com/newrelic/newrelic-browser-agent/commit/6dd09c505af87b3a1b08330362eca46951ea22ed))
* Session replay preload without autoStart ([#985](https://github.com/newrelic/newrelic-browser-agent/issues/985)) ([f50351a](https://github.com/newrelic/newrelic-browser-agent/commit/f50351acb08b65b03e7f4b5530a001a80fc04ece))
* Soft navigations memory leak on harvest ([#979](https://github.com/newrelic/newrelic-browser-agent/issues/979)) ([53bb120](https://github.com/newrelic/newrelic-browser-agent/commit/53bb1209cb66fe1a52385b2863e35a93fb29afae))

## [1.256.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.256.0...v1.256.1) (2024-04-15)


### Bug Fixes

* Revert "Generate PTID in Agent" ([#976](https://github.com/newrelic/newrelic-browser-agent/issues/976)) ([34b317f](https://github.com/newrelic/newrelic-browser-agent/commit/34b317fe577487af56d48861b7f256ec8d644d69))

## [1.256.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.255.0...v1.256.0) (2024-04-11)


### Features

* Adjust Session Replay Error Tracking ([#951](https://github.com/newrelic/newrelic-browser-agent/issues/951)) ([91d65b5](https://github.com/newrelic/newrelic-browser-agent/commit/91d65b5b7b5b7e753a6603150fd4bb7d2543babd))
* Allow unmasking elements with nr-unmask selectors ([#949](https://github.com/newrelic/newrelic-browser-agent/issues/949)) ([e17aa25](https://github.com/newrelic/newrelic-browser-agent/commit/e17aa25ee098115ad23a5fb9ae268a4b5769fac1))
* Generate PTID in Agent ([#964](https://github.com/newrelic/newrelic-browser-agent/issues/964)) ([af7b676](https://github.com/newrelic/newrelic-browser-agent/commit/af7b6764f40cb1ddfb3ab2ca16d05d8e4f459f4e))


### Bug Fixes

* Resume Page Focus Now Checks Session State ([#961](https://github.com/newrelic/newrelic-browser-agent/issues/961)) ([e48af6b](https://github.com/newrelic/newrelic-browser-agent/commit/e48af6beb369daf6ddc8231daa040f0d9d204d5f))
* stabilize timestamp corrections ([#966](https://github.com/newrelic/newrelic-browser-agent/issues/966)) ([4fbe962](https://github.com/newrelic/newrelic-browser-agent/commit/4fbe962d7b268968df96da59058e2e53c527c5eb))

## [1.255.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.254.1...v1.255.0) (2024-04-04)


### Features

* Adjust SR Timestamps to NR Server Time ([#939](https://github.com/newrelic/newrelic-browser-agent/issues/939)) ([94f0dee](https://github.com/newrelic/newrelic-browser-agent/commit/94f0deed02a8f5e9d668f3fe5a68ada86cecc439))
* Send CLS as timing node additionally ([#935](https://github.com/newrelic/newrelic-browser-agent/issues/935)) ([88e71da](https://github.com/newrelic/newrelic-browser-agent/commit/88e71da521f1a58af28ae17fee13f648affd262a))
* Switch web vitals library to attribution build ([#919](https://github.com/newrelic/newrelic-browser-agent/issues/919)) ([f36acbc](https://github.com/newrelic/newrelic-browser-agent/commit/f36acbc03c4f4d51e65431a270a008e65bb2cfff))
* Update agent to use new relic server time ([#918](https://github.com/newrelic/newrelic-browser-agent/issues/918)) ([8a4831c](https://github.com/newrelic/newrelic-browser-agent/commit/8a4831cd1f2d32d97daa8788967b15d7f2f723d3))

## [1.254.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.254.0...v1.254.1) (2024-03-26)


### Bug Fixes

* Server Timing - Remove reliance on performance API ([#930](https://github.com/newrelic/newrelic-browser-agent/issues/930)) ([250efcd](https://github.com/newrelic/newrelic-browser-agent/commit/250efcd3bf0a730adbb9d5c45be0bf2f71189664))

## [1.254.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.253.0...v1.254.0) (2024-03-25)


### Features

* Add rum-response metadata handler ([#913](https://github.com/newrelic/newrelic-browser-agent/issues/913)) ([2c99a5b](https://github.com/newrelic/newrelic-browser-agent/commit/2c99a5b11300ea9ef9ee7b5158b9d42c00693d03))
* Calculate New Relic time in the agent ([#911](https://github.com/newrelic/newrelic-browser-agent/issues/911)) ([91b1f96](https://github.com/newrelic/newrelic-browser-agent/commit/91b1f96efafe19f7b1b3fd4f39b9af1136b0a3a8))
* maintain a harvestCount for use later with harvestId ([#922](https://github.com/newrelic/newrelic-browser-agent/issues/922)) ([d0b5b7d](https://github.com/newrelic/newrelic-browser-agent/commit/d0b5b7d644b8ffc3667bf3b2521733cc7940f982))
* Standardize all feature behavior to wait for RUM response ([#927](https://github.com/newrelic/newrelic-browser-agent/issues/927)) ([ac266fa](https://github.com/newrelic/newrelic-browser-agent/commit/ac266faea203a7edc01ddecabbfdcc13bf602081))


### Bug Fixes

* Remove webpack imports in npm package ([#925](https://github.com/newrelic/newrelic-browser-agent/issues/925)) ([7b35238](https://github.com/newrelic/newrelic-browser-agent/commit/7b35238d53df97ca0183f06642601eb381aad063))

## [1.253.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.252.1...v1.253.0) (2024-03-13)


### Features

* Apply deny list to ajax metrics ([#898](https://github.com/newrelic/newrelic-browser-agent/issues/898)) ([a5c2adc](https://github.com/newrelic/newrelic-browser-agent/commit/a5c2adc0ecbe322ea9a9dcdf1ed3b072c1212415))
* Isolate observation context per agent ([#903](https://github.com/newrelic/newrelic-browser-agent/issues/903)) ([85887c8](https://github.com/newrelic/newrelic-browser-agent/commit/85887c8e7f4241076daeeda75077e6ee710a3d00))
* Preload the Session Replay recorder when properly configured ([#893](https://github.com/newrelic/newrelic-browser-agent/issues/893)) ([bc5ebb5](https://github.com/newrelic/newrelic-browser-agent/commit/bc5ebb5cb255fda7f2c30d5053b5a980a423c2b1))
* Soft Navigations trial ([#808](https://github.com/newrelic/newrelic-browser-agent/issues/808)) ([7fcb627](https://github.com/newrelic/newrelic-browser-agent/commit/7fcb62791ad932cbd3b9f16a72277b42bca9a75f))

## [1.252.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.252.0...v1.252.1) (2024-02-29)


### Bug Fixes

* Fix webpack imports in npm package ([#905](https://github.com/newrelic/newrelic-browser-agent/issues/905)) ([35810a8](https://github.com/newrelic/newrelic-browser-agent/commit/35810a895b7f61ab60ea5c24adfa49c4a3956191))
* Page load after session timeouts don't start new session ([#899](https://github.com/newrelic/newrelic-browser-agent/issues/899)) ([5c952a0](https://github.com/newrelic/newrelic-browser-agent/commit/5c952a0a212922d84dfd7e8eb388fdbd566b6c00))

## [1.252.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.251.1...v1.252.0) (2024-02-12)


### Features

* add types mappings for esm distribution ([#887](https://github.com/newrelic/newrelic-browser-agent/issues/887)) ([811ed41](https://github.com/newrelic/newrelic-browser-agent/commit/811ed418b74dcb8f25544da79521c384b9fd498a))
* align browser reported uncaught syntax errors ([#881](https://github.com/newrelic/newrelic-browser-agent/issues/881)) ([d4a0f30](https://github.com/newrelic/newrelic-browser-agent/commit/d4a0f30e0ab4d8edbdb17bf4ebdf282626761045))
* Capture Internal Metrics for Session Replay Configurations ([#879](https://github.com/newrelic/newrelic-browser-agent/issues/879)) ([f60e7f1](https://github.com/newrelic/newrelic-browser-agent/commit/f60e7f155bb95087ea4af8864b652878f08ccaff))
* Create more granular metrics about stylesheet fix success ([#882](https://github.com/newrelic/newrelic-browser-agent/issues/882)) ([697f13e](https://github.com/newrelic/newrelic-browser-agent/commit/697f13e6ea5ba0738ffd74dfd214751ab98adf8d))
* Report config changes away from default state for UX improvement ([#885](https://github.com/newrelic/newrelic-browser-agent/issues/885)) ([aa19a9c](https://github.com/newrelic/newrelic-browser-agent/commit/aa19a9c0737c175c011656f3da3f327dc6442f04))


### Bug Fixes

* Add safe logic to snapshots ([#884](https://github.com/newrelic/newrelic-browser-agent/issues/884)) ([1fcdd8d](https://github.com/newrelic/newrelic-browser-agent/commit/1fcdd8d9a20819911ba7e7350354085a57f1b187))
* Fix adblock memory leak ([#877](https://github.com/newrelic/newrelic-browser-agent/issues/877)) ([695415b](https://github.com/newrelic/newrelic-browser-agent/commit/695415b0fcaa8b41496fc6556a38ec76dd357539))

## [1.251.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.251.0...v1.251.1) (2024-01-29)


### Bug Fixes

* Fix deferred Session Replay payloads ([#868](https://github.com/newrelic/newrelic-browser-agent/issues/868)) ([f69e4b0](https://github.com/newrelic/newrelic-browser-agent/commit/f69e4b0eba5a54f4e67316f5e6a30090cf7360cc))
* Pass unload options to simultaneous harvests in Session Replay ([#870](https://github.com/newrelic/newrelic-browser-agent/issues/870)) ([655aa5d](https://github.com/newrelic/newrelic-browser-agent/commit/655aa5d261d03f71086d3cfc73cb72db51cb28c7))

## [1.251.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.250.0...v1.251.0) (2024-01-24)


### Features

* Session Replay - Detect Non-Inlined Stylesheets ([#859](https://github.com/newrelic/newrelic-browser-agent/issues/859)) ([69a8e00](https://github.com/newrelic/newrelic-browser-agent/commit/69a8e00ce66c41a29f551697299246763e7ae29f))


### Bug Fixes

* Add fallback for currentBufferTarget ([#861](https://github.com/newrelic/newrelic-browser-agent/issues/861)) ([f43b791](https://github.com/newrelic/newrelic-browser-agent/commit/f43b7914ec1f26f610cbaa1a513bac482a3d6534))
* Bubble Up API Methods to Top-Level Instance For NPM ([#862](https://github.com/newrelic/newrelic-browser-agent/issues/862)) ([cd6324f](https://github.com/newrelic/newrelic-browser-agent/commit/cd6324fb79edab77725d9c72f91d2bcb7e860f57))

## [1.250.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.249.0...v1.250.0) (2024-01-09)


### Features

* Add a flag to note that a payload occurred during a replay ([#834](https://github.com/newrelic/newrelic-browser-agent/issues/834)) ([1b898c6](https://github.com/newrelic/newrelic-browser-agent/commit/1b898c61fa260bd0df644b4825ddb6d1c9b54b51))
* Session Replay Dynamic Loading ([#832](https://github.com/newrelic/newrelic-browser-agent/issues/832)) ([1af7b89](https://github.com/newrelic/newrelic-browser-agent/commit/1af7b896ef41c8b4855ca85e2a4e40c20a8cdfb1))


### Bug Fixes

* TraceId generation regression (non-random trace ids) ([#853](https://github.com/newrelic/newrelic-browser-agent/issues/853)) ([8767f69](https://github.com/newrelic/newrelic-browser-agent/commit/8767f69122853a4099ed25f5886a91de06703c98))

## [1.249.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.248.0...v1.249.0) (2023-12-14)


### Features

* Allow empty string for Session Replay masking value ([#831](https://github.com/newrelic/newrelic-browser-agent/issues/831)) ([34f837f](https://github.com/newrelic/newrelic-browser-agent/commit/34f837f65ab31a67b821f125e20e80d39d7790a9))


### Bug Fixes

* Fix API Warning Messages ([#830](https://github.com/newrelic/newrelic-browser-agent/issues/830)) ([2b13a0f](https://github.com/newrelic/newrelic-browser-agent/commit/2b13a0fdfad529dc1cfff43506e28473498ce8a1))
* loader missing sub-resource integrity hashes ([#837](https://github.com/newrelic/newrelic-browser-agent/issues/837)) ([a9b6f2e](https://github.com/newrelic/newrelic-browser-agent/commit/a9b6f2e578b1684dd50f8eb491251c03eca88a12))
* traceids not random when using `webcrypto` ([#825](https://github.com/newrelic/newrelic-browser-agent/issues/825)) ([e264acf](https://github.com/newrelic/newrelic-browser-agent/commit/e264acfbff2cacc93fae88daea70be3c1e006f90))

## [1.248.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.247.0...v1.248.0) (2023-11-16)


### Features

* Report enduser.id with Session Replay ([#815](https://github.com/newrelic/newrelic-browser-agent/issues/815)) ([8f5446d](https://github.com/newrelic/newrelic-browser-agent/commit/8f5446d1f7679f6a5ea0ba90eb082d1d4deb0d93))


### Bug Fixes

* Fix issue with errors forcefully triggering session traces ([#819](https://github.com/newrelic/newrelic-browser-agent/issues/819)) ([3872c35](https://github.com/newrelic/newrelic-browser-agent/commit/3872c35a173f76644b663df5ca0474971451b7cf))

## [1.247.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.246.1...v1.247.0) (2023-11-14)


### Features

* Add basic support for deferring the browser agent loader script ([#800](https://github.com/newrelic/newrelic-browser-agent/issues/800)) ([92d864c](https://github.com/newrelic/newrelic-browser-agent/commit/92d864cb12a3076fd9b623fcd411d2dc9190110c))
* Add relative timestamps to Session Replay payloads ([#810](https://github.com/newrelic/newrelic-browser-agent/issues/810)) ([e4d1c70](https://github.com/newrelic/newrelic-browser-agent/commit/e4d1c701228e011d7c6f9d84cdc107044c69ce79))
* Add session durationMs to Session Replay payloads ([#792](https://github.com/newrelic/newrelic-browser-agent/issues/792)) ([3dfc4d4](https://github.com/newrelic/newrelic-browser-agent/commit/3dfc4d43fa978eeec47ebf432f8741562d0dd864))
* Enable SRI and nonce attributes for async chunks ([#805](https://github.com/newrelic/newrelic-browser-agent/issues/805)) ([fd9c3f3](https://github.com/newrelic/newrelic-browser-agent/commit/fd9c3f388f17353796ac2ebf18814353ca819dcf))
* Expose library versions used to capture session replay data ([#809](https://github.com/newrelic/newrelic-browser-agent/issues/809)) ([bc275ee](https://github.com/newrelic/newrelic-browser-agent/commit/bc275ee20242a5208358a0a77ac75e2b7cbd11c4))
* Session Replay API ([#803](https://github.com/newrelic/newrelic-browser-agent/issues/803)) ([12eb453](https://github.com/newrelic/newrelic-browser-agent/commit/12eb4530cfb5eb1e0a94d858485be0df40582c21))

## [1.246.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.246.0...v1.246.1) (2023-10-31)


### Bug Fixes

* Fix missing type declarations ([#791](https://github.com/newrelic/newrelic-browser-agent/issues/791)) ([c80e8d2](https://github.com/newrelic/newrelic-browser-agent/commit/c80e8d260a8919a41ebca7bdc182937819464dc7))

## [1.246.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.245.0...v1.246.0) (2023-10-23)


### Features

* Add network info to all page view timing events ([#768](https://github.com/newrelic/newrelic-browser-agent/issues/768)) ([757cf19](https://github.com/newrelic/newrelic-browser-agent/commit/757cf1953af471118d809414cd41297a87c89a34))
* Replace url parsing with URL class ([#781](https://github.com/newrelic/newrelic-browser-agent/issues/781)) ([4206263](https://github.com/newrelic/newrelic-browser-agent/commit/42062638850b4b410ac75eb008120ec4a82583c1))


### Bug Fixes

* Add feature flag support for Browser Interactions ([#779](https://github.com/newrelic/newrelic-browser-agent/issues/779)) ([aa39c6c](https://github.com/newrelic/newrelic-browser-agent/commit/aa39c6cd2aeefaecd803aeb0736ad7aef8477bc4))
* Add first harvest of session flags to RUM and Trace ([#765](https://github.com/newrelic/newrelic-browser-agent/issues/765)) ([ab2e9dd](https://github.com/newrelic/newrelic-browser-agent/commit/ab2e9dd2252143635b67ea9da4e07867ec68cd0f))

## [1.245.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.244.0...v1.245.0) (2023-10-18)


### Features

* Allow boolean values in setCustomAttribute ([#776](https://github.com/newrelic/newrelic-browser-agent/issues/776)) ([d44f033](https://github.com/newrelic/newrelic-browser-agent/commit/d44f03384655f47c5f8a63db02f7eaac58585a86))
* Detect GraphQL operation names and types in AJAX calls ([#764](https://github.com/newrelic/newrelic-browser-agent/issues/764)) ([8587afc](https://github.com/newrelic/newrelic-browser-agent/commit/8587afc9dbc18a52048f467c77e5ededc225eb2a))
* Removing worker build ([#762](https://github.com/newrelic/newrelic-browser-agent/issues/762)) ([15f801b](https://github.com/newrelic/newrelic-browser-agent/commit/15f801b1a48c6e60f8f50f349aa382c77a073480))

## [1.244.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.243.1...v1.244.0) (2023-10-10)


### Features

* Add Session Replay configurations to collect inline assets ([#763](https://github.com/newrelic/newrelic-browser-agent/issues/763)) ([cef08dd](https://github.com/newrelic/newrelic-browser-agent/commit/cef08dd3f0cd99735dbc719e3c075fe83bbc6219))
* Bump rrweb to 2.0.0.11 and make constant dynamic at build time ([#770](https://github.com/newrelic/newrelic-browser-agent/issues/770)) ([9ea84cf](https://github.com/newrelic/newrelic-browser-agent/commit/9ea84cf247b31af544e2ea7ed0873241ff82eebc))
* Ensure 15 second minimum error buffer when possible ([#759](https://github.com/newrelic/newrelic-browser-agent/issues/759)) ([8506803](https://github.com/newrelic/newrelic-browser-agent/commit/8506803eaba27b7c603432f8ba0c909b677d3c3b))


### Bug Fixes

* Fix invalid timestamps ([#771](https://github.com/newrelic/newrelic-browser-agent/issues/771)) ([bc5a57c](https://github.com/newrelic/newrelic-browser-agent/commit/bc5a57c8c42c62c311e24b77f00dc1225a3b5873))
* Isolate browser interaction node ([#758](https://github.com/newrelic/newrelic-browser-agent/issues/758)) ([b9e8277](https://github.com/newrelic/newrelic-browser-agent/commit/b9e82773c67d710e0f6dc1f892908afc8be004cd))

## [1.243.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.243.0...v1.243.1) (2023-10-04)


### Bug Fixes

* Improve Session Replay abort metric reliability ([#754](https://github.com/newrelic/newrelic-browser-agent/issues/754)) ([14f08ac](https://github.com/newrelic/newrelic-browser-agent/commit/14f08aca8bf1a610984fc2303604a04910f07db6))

## [1.243.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.242.0...v1.243.0) (2023-10-04)


### Features

* Do not report ajax nodes in session traces if in deny list ([#750](https://github.com/newrelic/newrelic-browser-agent/issues/750)) ([8106bfa](https://github.com/newrelic/newrelic-browser-agent/commit/8106bfa6fcfff13829cc1368e8e7ee85ed11480e))
* Remove deprecated API inlineHit ([#744](https://github.com/newrelic/newrelic-browser-agent/issues/744)) ([54b42ea](https://github.com/newrelic/newrelic-browser-agent/commit/54b42eae2ae8692e5f463b7a3441e3be9e40cc5e))


### Bug Fixes

* Adjust Session Replay meta and timestamps ([#743](https://github.com/newrelic/newrelic-browser-agent/issues/743)) ([ed727c6](https://github.com/newrelic/newrelic-browser-agent/commit/ed727c65fe3029b4b9c094880b2f016db2c1cec3))
* Re-update assets proxy to accept host URL strings ([#752](https://github.com/newrelic/newrelic-browser-agent/issues/752)) ([a7f58a3](https://github.com/newrelic/newrelic-browser-agent/commit/a7f58a3a83804d6102bb159ab2ae410e39ad884f))
* Set Session Replay first chunk flags more reliably ([#740](https://github.com/newrelic/newrelic-browser-agent/issues/740)) ([42a15e1](https://github.com/newrelic/newrelic-browser-agent/commit/42a15e14a0f13e8b7a2b0afbaf6b30893fd701b4))
* Tap session entity into storage api for changes across tabs ([#741](https://github.com/newrelic/newrelic-browser-agent/issues/741)) ([81bedc6](https://github.com/newrelic/newrelic-browser-agent/commit/81bedc6d4922379ad6e10a0ec7aaa72f85e253cf))

## [1.242.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.241.0...v1.242.0) (2023-09-25)


### Features

* Add messaging about Session Replay abort behavior ([#734](https://github.com/newrelic/newrelic-browser-agent/issues/734)) ([e5cd3f1](https://github.com/newrelic/newrelic-browser-agent/commit/e5cd3f18b7c3f569dc46f90f1eba40b52092e1d0))
* Applying new cache headers to assets ([#722](https://github.com/newrelic/newrelic-browser-agent/issues/722)) ([9ab1c37](https://github.com/newrelic/newrelic-browser-agent/commit/9ab1c37783468f423ca8c1db835ea6f0bea504b3))


### Bug Fixes

* Drain event emitter even when feature fails to initialize ([#730](https://github.com/newrelic/newrelic-browser-agent/issues/730)) ([06edda5](https://github.com/newrelic/newrelic-browser-agent/commit/06edda57f963f68a928244ab6c7e8a26b056b2c3))
* Validation of SR configurations ([#721](https://github.com/newrelic/newrelic-browser-agent/issues/721)) ([12f5ec0](https://github.com/newrelic/newrelic-browser-agent/commit/12f5ec00e3e13b3d8c2d8884de315752873e4d0e))

## [1.241.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.240.0...v1.241.0) (2023-09-18)


### Features

* Add SR entrypoint to NPM ahead of LP ([#714](https://github.com/newrelic/newrelic-browser-agent/issues/714)) ([4de7e9e](https://github.com/newrelic/newrelic-browser-agent/commit/4de7e9e4ecd563232f4c9a8a2f985c3307e79bf7))
* Removing hash from chunk asset name ([#706](https://github.com/newrelic/newrelic-browser-agent/issues/706)) ([fdc2c29](https://github.com/newrelic/newrelic-browser-agent/commit/fdc2c29e2b43d691e3b613d8729b1c9615f72114))


### Bug Fixes

* Final harvest does not happen when initial RUM call fails ([#702](https://github.com/newrelic/newrelic-browser-agent/issues/702)) ([feb8726](https://github.com/newrelic/newrelic-browser-agent/commit/feb8726faba6257c2173b9e0a9aebaeee1f449a6))

## [1.240.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.239.1...v1.240.0) (2023-09-12)


### Features

* Add session trace metadata params ([#676](https://github.com/newrelic/newrelic-browser-agent/issues/676)) ([882b21c](https://github.com/newrelic/newrelic-browser-agent/commit/882b21c6e62eb08ea2571348bb9ae1f94bd06201))
* Add SR to pro and spa builds (only runs for LP customers) ([#677](https://github.com/newrelic/newrelic-browser-agent/issues/677)) ([6d8ddb4](https://github.com/newrelic/newrelic-browser-agent/commit/6d8ddb4fd0eb4120ddfa097249a62e8b9866072d))
* Centralize web vitals timings ([#635](https://github.com/newrelic/newrelic-browser-agent/issues/635)) ([d912e94](https://github.com/newrelic/newrelic-browser-agent/commit/d912e943470b4dbe8b2544fdcc3f89d757041c35))
* Origin of agent webpack chunks now changeable ([#659](https://github.com/newrelic/newrelic-browser-agent/issues/659)) ([739e2dd](https://github.com/newrelic/newrelic-browser-agent/commit/739e2dd8032bc92cebd238159c42e8ceb81a6b37))

## [1.239.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.239.0...v1.239.1) (2023-09-02)


### Bug Fixes

* Fix internal release process ([#672](https://github.com/newrelic/newrelic-browser-agent/issues/672)) ([ab0309f](https://github.com/newrelic/newrelic-browser-agent/commit/ab0309fbed343b6dab4c2ec82cf7f22e071eb9df))

## [1.239.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.238.0...v1.239.0) (2023-09-01)


### Features

* Add best effort to detect Ajax events before instantiation ([#648](https://github.com/newrelic/newrelic-browser-agent/issues/648)) ([2d3c9d3](https://github.com/newrelic/newrelic-browser-agent/commit/2d3c9d36d4e59343a1b228322e1040d2f3f911b8))
* Add mode to enable agent to not harvest until user consent ([#656](https://github.com/newrelic/newrelic-browser-agent/issues/656)) ([9141a45](https://github.com/newrelic/newrelic-browser-agent/commit/9141a45cdb3fffd2306fcc5388ed74142d167c53))
* Remove allow_bfcache flag ([#652](https://github.com/newrelic/newrelic-browser-agent/issues/652)) ([ec113af](https://github.com/newrelic/newrelic-browser-agent/commit/ec113af80fd565ff50ba825b82e5f4d1b74d09b7))
* Removing old supportability metrics ([#669](https://github.com/newrelic/newrelic-browser-agent/issues/669)) ([c17d344](https://github.com/newrelic/newrelic-browser-agent/commit/c17d344389eb2262ff5d3ca94a1748e519220921))


### Bug Fixes

* Fixing issue with leaking event listeners ([#668](https://github.com/newrelic/newrelic-browser-agent/issues/668)) ([6cb8238](https://github.com/newrelic/newrelic-browser-agent/commit/6cb823842fab406a33b9698edee1932c29204df3))
* Issues with types resolution ([#670](https://github.com/newrelic/newrelic-browser-agent/issues/670)) ([85336a4](https://github.com/newrelic/newrelic-browser-agent/commit/85336a43595bbf3d2793aafe665a47650a20ed21))

## [1.238.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.237.1...v1.238.0) (2023-08-16)


### Features

* Add API: setApplicationVersion ([#639](https://github.com/newrelic/newrelic-browser-agent/issues/639)) ([4bb3e81](https://github.com/newrelic/newrelic-browser-agent/commit/4bb3e81b9a2fb0c0f075f3f72e90d21ffdde06fb))
* Reducing the agent chunk count ([#637](https://github.com/newrelic/newrelic-browser-agent/issues/637)) ([043becf](https://github.com/newrelic/newrelic-browser-agent/commit/043becf2d8c766516cecd614b54de3fc5acad1e2))


### Bug Fixes

* Capture potential missing tail data for session trace ([#624](https://github.com/newrelic/newrelic-browser-agent/issues/624)) ([1941427](https://github.com/newrelic/newrelic-browser-agent/commit/194142763a117b7c5ac30f22a73b0577d2112fba))
* Fix distributed tracing handling of empty string fetch parameter ([#640](https://github.com/newrelic/newrelic-browser-agent/issues/640)) ([5dca741](https://github.com/newrelic/newrelic-browser-agent/commit/5dca741ae0c98ef50cf2170cdd4f075e0c8bbae9))
* Typo in type declarations ([#634](https://github.com/newrelic/newrelic-browser-agent/issues/634)) ([ada8ad2](https://github.com/newrelic/newrelic-browser-agent/commit/ada8ad2e2c85065c46237fa45cce7ddec8368e53))

## [1.237.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.237.0...v1.237.1) (2023-08-02)


### Bug Fixes

* Fix serialization issue with array data ([#621](https://github.com/newrelic/newrelic-browser-agent/issues/621)) ([6887940](https://github.com/newrelic/newrelic-browser-agent/commit/6887940a01f74761840058742e04efd0f9130bb9))
* prevent dollar symbol only variable names ([#631](https://github.com/newrelic/newrelic-browser-agent/issues/631)) ([cff7bc4](https://github.com/newrelic/newrelic-browser-agent/commit/cff7bc4fbc4cd9620e319b3f6f2861515f7b01a8))
* SPA feature respects ajax deny_list for fetch ([#633](https://github.com/newrelic/newrelic-browser-agent/issues/633)) ([ccfe510](https://github.com/newrelic/newrelic-browser-agent/commit/ccfe51063cd59e946e20ec870ce5979b1ca73054))
* Undefined deny list ignores block internal ([#629](https://github.com/newrelic/newrelic-browser-agent/issues/629)) ([27a1b04](https://github.com/newrelic/newrelic-browser-agent/commit/27a1b044ae239d83c85c7e25f69979b23b985e54))

## [1.237.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.236.0...v1.237.0) (2023-07-28)


### Features

* Add warning for large payloads ([#620](https://github.com/newrelic/newrelic-browser-agent/issues/620)) ([d616f64](https://github.com/newrelic/newrelic-browser-agent/commit/d616f64e0b6369becea6007a428061932c534f48))
* reduce jserrors wrapping and remove onerror use ([#614](https://github.com/newrelic/newrelic-browser-agent/issues/614)) ([e393c96](https://github.com/newrelic/newrelic-browser-agent/commit/e393c966239bae2054c6878ce0c0c53180fabc5d))
* Stop reporting ajax events going to same beacon ([#609](https://github.com/newrelic/newrelic-browser-agent/issues/609)) ([ca43edf](https://github.com/newrelic/newrelic-browser-agent/commit/ca43edfd1c6d477a647e7ce97b6f975134ea1b35))


### Bug Fixes

* Defining agent api methods for ts types ([#613](https://github.com/newrelic/newrelic-browser-agent/issues/613)) ([14d4294](https://github.com/newrelic/newrelic-browser-agent/commit/14d42949668fad44f1553179f2c6897a84d4b771))
* Fix potential property of undefined errors ([#610](https://github.com/newrelic/newrelic-browser-agent/issues/610)) ([389b5ad](https://github.com/newrelic/newrelic-browser-agent/commit/389b5ad2c17b74574f98ec6bc24d726061b8a3c0))
* prevent invalid error stack traces ([#617](https://github.com/newrelic/newrelic-browser-agent/issues/617)) ([3d9f2c0](https://github.com/newrelic/newrelic-browser-agent/commit/3d9f2c060d0c06b70c14fc8d2b57828ad78cf7ea))
* Remove fetch keep-alive unhandled rejection ([#625](https://github.com/newrelic/newrelic-browser-agent/issues/625)) ([dc4fb1b](https://github.com/newrelic/newrelic-browser-agent/commit/dc4fb1babb53b2dcb0abd045ba59390d47a58cb4))

## [1.236.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.235.0...v1.236.0) (2023-06-27)


### Features

* Expose MicroLoader in the npm package ([#589](https://github.com/newrelic/newrelic-browser-agent/issues/589)) ([5175356](https://github.com/newrelic/newrelic-browser-agent/commit/5175356dfa3c959580ae26644948afc7a8f9cd6a))
* Remove img, jsonp, and xhrGet methods ([#576](https://github.com/newrelic/newrelic-browser-agent/issues/576)) ([f92f88e](https://github.com/newrelic/newrelic-browser-agent/commit/f92f88ec7a90617d644019a32baeab5fd9595201))


### Bug Fixes

* Fix illegal invocation error on final harvest ([#594](https://github.com/newrelic/newrelic-browser-agent/issues/594)) ([de7049f](https://github.com/newrelic/newrelic-browser-agent/commit/de7049f6892424f607b6d09c90ebef2909d0b19f))
* Handle chunk load promise error introduced in 1.235.0 ([#603](https://github.com/newrelic/newrelic-browser-agent/issues/603)) ([a702e23](https://github.com/newrelic/newrelic-browser-agent/commit/a702e2333b31f9088e7076727eb4a6cf26615841))

## [1.235.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.234.0...v1.235.0) (2023-06-20)


### Features

* Add error mode to session trace ([#583](https://github.com/newrelic/newrelic-browser-agent/issues/583)) ([98e3f18](https://github.com/newrelic/newrelic-browser-agent/commit/98e3f18c182be93b93386968026555c2575fd29d))
* Decorate error objects to facilitate future UI experiences ([#574](https://github.com/newrelic/newrelic-browser-agent/issues/574)) ([1167c98](https://github.com/newrelic/newrelic-browser-agent/commit/1167c9826cd78be0f4a9c6cb5d74c6d37685ba0e))
* Minor feature class changes to support testing new features ([#571](https://github.com/newrelic/newrelic-browser-agent/issues/571)) ([a717951](https://github.com/newrelic/newrelic-browser-agent/commit/a717951d12b41ec68f79548c68370cd89502e539))
* Remove unused data from session trace requests ([276c4f6](https://github.com/newrelic/newrelic-browser-agent/commit/276c4f6ee35063e6b22cb2dc4c70729ffb89ca3d))
* Use new shared session for Session Trace feature ([#545](https://github.com/newrelic/newrelic-browser-agent/issues/545)) ([dbd995a](https://github.com/newrelic/newrelic-browser-agent/commit/dbd995a995af27f4f99316860ece7bcb24f53e73))

## [1.234.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.233.1...v1.234.0) (2023-06-02)


### Features

* Migrate RUM network call from GET to POST ([#521](https://github.com/newrelic/newrelic-browser-agent/issues/521)) ([937812a](https://github.com/newrelic/newrelic-browser-agent/commit/937812abdc561223028176df6c8bf2b7100b09b2))

## [1.233.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.233.0...v1.233.1) (2023-05-31)


### Bug Fixes

* Address bug affecting XHR harvest re-schedule ([#561](https://github.com/newrelic/newrelic-browser-agent/issues/561)) ([cd2dc90](https://github.com/newrelic/newrelic-browser-agent/commit/cd2dc90f04bbce81cddaa408413c47596bfb2b2b))

## [1.233.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.232.1...v1.233.0) (2023-05-26)


### Features

* Capture metrics for usage of MooTools and certain polyfills ([#539](https://github.com/newrelic/newrelic-browser-agent/issues/539)) ([903a7e1](https://github.com/newrelic/newrelic-browser-agent/commit/903a7e1e93a09f4e94ae76e95659a203ecb2896b))
* Update agent internals in early preparation for new features ([#532](https://github.com/newrelic/newrelic-browser-agent/issues/532)) ([1ee675d](https://github.com/newrelic/newrelic-browser-agent/commit/1ee675d232fb9a233c36ad0a2b998739fbaa1b8b))


### Bug Fixes

* Address "configurable" warnings arising from user-agent module ([#546](https://github.com/newrelic/newrelic-browser-agent/issues/546)) ([7a7dace](https://github.com/newrelic/newrelic-browser-agent/commit/7a7daceeaed603396805d81c9afd4cac4364cb40))
* Ensure runtime is preserved for late-configuration cases ([#538](https://github.com/newrelic/newrelic-browser-agent/issues/538)) ([229b8ed](https://github.com/newrelic/newrelic-browser-agent/commit/229b8ed0f4bc558cae62dd34ab6d32c302084d0b))
* Refactor usage of Array.from to address MooTools conflict ([#544](https://github.com/newrelic/newrelic-browser-agent/issues/544)) ([f1e6336](https://github.com/newrelic/newrelic-browser-agent/commit/f1e63367f653a957b0a401fbd21d24a1ca898bbd))

## [1.232.1](https://github.com/newrelic/newrelic-browser-agent/compare/v1.232.0...v1.232.1) (2023-05-17)


### Bug Fixes

* Add X-NewRelic-ID header only if defined ([#531](https://github.com/newrelic/newrelic-browser-agent/issues/531)) ([36ceedf](https://github.com/newrelic/newrelic-browser-agent/commit/36ceedf03e88ac0dc48eb9577bdceb8602f08359))
* Identify inline stack trace URLs more precisely ([#522](https://github.com/newrelic/newrelic-browser-agent/issues/522)) ([1aba92d](https://github.com/newrelic/newrelic-browser-agent/commit/1aba92dbaa57fb8254fa007f65b7173a716e2e8f))

## [1.232.0](https://github.com/newrelic/newrelic-browser-agent/compare/v1.231.0...v1.232.0) (2023-05-08)


### Features

* Add internal session metrics ([bcfe6ff](https://github.com/newrelic/newrelic-browser-agent/commit/bcfe6ffff9d0be583bbd9d5d6ef78265aaa753cb))
* Add new stateful Session Manager ([#464](https://github.com/newrelic/newrelic-browser-agent/issues/464)) ([32e1061](https://github.com/newrelic/newrelic-browser-agent/commit/32e1061646d89d6270f027acd5e35bc089323bda))
* Add query parameter supportability metrics ([#518](https://github.com/newrelic/newrelic-browser-agent/issues/518)) ([88c2d83](https://github.com/newrelic/newrelic-browser-agent/commit/88c2d83609c2b11aad81d4480fce25b007c4b4fa))
* Allow custom error grouping ([f95630d](https://github.com/newrelic/newrelic-browser-agent/commit/f95630dfbbb7234950fc37216c059218237eeb11))

## v1.231.0

### Omit CLS scores before web-vitals report them
Initial snapshots of CLS reported as 0s attached to timing metrics will be omitted, so as to "de-noise" the aggregate CLS dataset. This also temporarily addresses an edge case of long loading pages potentially sending a "final" CLS value of 0, inaccurately. The case of a final 0 CLS when a user only navigates away from the page has also been fixed.

### Fix accepted argument type for `all` and `race` methods of `Promise`
The wrapped Promise's static `all` and `race` methods now work with iterators per native implementation, rather than only arrays.

### Upgrade Navigation Timing API in `PageView` (RUM) call
The performance entry data sent for `PageView` now uses the Navigation Timing Level 2 API over the deprecated Level 1 API.

### Fix typo in top-level API causing exception
An an uncaught reference exception was occurring on pages with more than one initialized agent due to a typo in the name of a variable (`returnsVals`).

### Add null entry checks to certain web-vitals handlers
For LCP and FID, we will exclude the performance entry info when there are no entries given by web-vitals. This had thrown exceptions.

### Remove previously added console logging measurements
This reverses performance impacts and exceptions introduced in the prior release by serializing console API arguments.

### Rectify version reported by NPM agent implementations
Agents installed via the NPM method will report the correct semantic version in data harvests.

### Fix exception when importing NPM package source code
An error was occurring related to a missing environment variable when importing from the NPM package source directly (versus via the CJS/ESM packages).

## v1.230.0

### Add persistence for custom attributes
Custom attributes may now optionally be persisted between page loads via session storage. The API method `setCustomAttribute` now takes a third parameter, which defaults to `false`. When `true`, this boolean indicates that the provided custom attribute should be persisted in session storage and restored on subsequent page loads. Session storage is subject to the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) of the browser.

### Add setUserId API
A new `setUserId` API method is now available. It defines a custom attribute containing a specified user ID, to be included in all payloads. The `setUserId` API is an extension of the `setCustomAttribute` API and automatically persists between page loads.

### Fix npm package browser targets
The previous npm package release included code that was not compatible with browsers in our [supported browser list](https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/#browser-types). The package exports will now default to code that matches our browser support list. The package will also include the source code for power users that would like more control over how the agent is built.

### Fix npm package exports
Some dangling, unused, and non-existent imports and exports were causing issues with consuming the NPM package in some projects. These have been removed.

### Fix npm package import for typescript projects
Fixed an issue where typescript projects attempting to import the browser agent library would not get proper auto-complete in the import statement and would receive module declaration errors. The browser agent will not use tsc to generate type definitions from the JavaScript code at build time. The package.json has been updated with appropriate type export declarations.

### Add error catch around sendBeacon
Added error catch logic around the sendBeacon usage. In the event sendBeacon throws an error during the final harvest, the final harvest will attempt to fall back to the image data submission method.

### Remove array reduce polyfill
Removed the array reduce polyfill in favor of the native browser array reduce method.

## v1.229.0

### Use semantic versioning scheme
The agent will now utilize semantic versioning for subsequent releases. The previous version (1228) will carry forward into 1.229.0, and so on.

### Use `web-vitals` library for internal timing calculations
In an effort to align and standardize the timings the agent collects, the agent now uses the [Google CWV](https://www.npmjs.com/package/web-vitals) library to track page timings such as CLS, LCP, FCP, TTFB and more. See [Core Web Vitals documentation](https://web.dev/learn-core-web-vitals/) for more information.

### Ship the Browser Agent repository to NPM
The Browser Agent repository will now be available as a pre-release NPM package. See [@newrelic/browser-agent](https://www.npmjs.com/package/@newrelic/browser-agent) for more information.

## v1228

### Fix negative offset timings
Fix an issue that caused session trace offset timings to be miscalculated in the early-page lifecycle, sometimes leading to negative "backend" timings.

## v1227

### Added INP and long tasks reporting
The interaction-to-next-paint metric is now calculated and reported at the end of user sessions, via the [Google CWV](https://github.com/GoogleChrome/web-vitals) library. In addition, long continuously executed and blocking scripts detected by the PerformanceLongTaskTiming API are also forwarded to New Relic. This latter functionality is `off` by default, until a curated UI experience is created to utilize this data.

### Revert unwrapping of globals on agent abort
Partial revert of graceful handling change made in v1225 that unwrapped modified global APIs and handlers, which caused integration issues with other wrapping libraries and code.

### Add internal metrics to evaluate feasibility page resource harvests
Internal metrics were added to track the feasibility and impact of collecting page resource information using the PerformanceObserver resource timings, such as scripts, images, network calls, and more. 

### Add resiliency around SPA interaction saving
Added resiliency code around SPA interaction node save functionality to ensure a cancelled interaction node without a parent further up the interaction tree does not cause an exception to be raised from the agent.

### Collect supportability metrics at the end of page life
Collate all of the internal statistic metrics calls, which--of today--are sent at page start and periodically, into one call made when the end user is leaving the page.

## v1226

### Revert xhr deny list timeslice metrics 
Customers were losing visibility into all calls on the page when denying timeslice metrics based on the deny list.  This change reverts to the behaviour seen in all previous versions of the Browser Agent.

### Enable back/forward cache
Updating the agent default configuration to enable the back/forward cache feature previously released in version 1222 by default.

### Handle unhandledPromiseRejections more gracefully
The agent will attempt to handle niche objects throw from `unhandledPromiseRejection` events more gracefully. These cases could include objects with frozen or static properties, or custom extensions of the Error class without a `set` method in place.

### Disable metrics for missing entitlement
Fixing issue where metrics harvesting was not being halted when the agent RUM call indicated the account did not have entitlement to the jserrors endpoint. Before this change, customers missing this entitlement would see network calls to the New Relic jserrors endpoint result in 403 or 409 errors.

### All agents must make a connect call for NR1 entity synthesis
This change forces all agents to call ingest at runtime to ensure that entities can be synthesized in NR1.  This particularly pertains to any bespoke agent builds that did not utilize the `page_view_event` feature.

## v1225

### Gracefully abort agent if not fully instantiated
When importing of agent code fails, as when content gets blocked, the agent will clean up memory, the global scope, and any wrapped or modified APIs as much as feasible.

### Refactor wrapping of Promise object
The agent's wrapping of the `Promise` object has been refactored to address conflicts with third party libraries and to add newer methods available on the native object. The new wrapping implementation is more conventional and less error-prone.

### Fix uncaught promise error introduced in v1223
In some cases of failure to import agent script chunk "629", an error was thrown rather than caught and logged as a warning. The uncaught promise error responsible for this unintended behavior has been fixed.

### Resolve Google indexing of agent relative paths
In previous versions, the agent script included relative paths to its lazy-loaded chunks, which Googlebot picked up and attempted to index as pages. This change removes those relatives paths from the loader and centralizes our lazy chunk loading of agent features.

## v1224

### Support SPA, XHR, and session trace features on Chrome for iOS
Previously, the agent didn't collect SPA browser interactions, XHR events, or session trace data in Chrome for iOS, which uses the webkit engine with modifications. The agent now collects the same data in Chrome for iOS as in other supported browsers.

### Fix multiple custom interaction end times
Fixed an issue where multiple custom interactions harvested at the same time would result in only one interaction being persisted in New Relic.

### Prevent AJAX time slice metrics based on deny list
Prevent time slice metric collection for AJAX calls when such a call matches an entry in the AJAX deny list.

### Bind navigator scope to sendBeacon
Some browser versions will throw errors if sendBeacon doesn't have the navigator scope bound to it. A fail-safe action of binding the navigator scope to sendBeacon was added to try to support those browsers.

### Expose build version to newrelic global
The build version is exposed to the `newrelic` global object. You can access it with `newrelic.intializedAgents[<agentID>].runtime.version`.

### Add automation for documentation site updates on new releases
A new release of the browser agent will automatically raise a PR to the documentation site with the relevant changelog items.

### Preserve unhandledPromiseRejection reasons as human-readable strings in error payloads
The agent will attempt to preserve `unhandledPromiseRejection` reasons as human-readable messages on the Error payload that gets harvested. The previous strategy didn't always work, because `Promise.reject` can pass any value, not just strings.

### Fix missing interactions for dynamic routes in Next/React
Fixed an issue where when using the SPA loader with Next/React, route changes that lazy loaded components wouldn't be captured. While the issue specifically called out Next/React, this should apply to Nuxt/Vue and Angular.

### Fix interactions missing API calls in Angular
Fixed an issue where when using the SPA loader with Angular, route changes that contained API calls, via Angular resolver, wouldn't capture the xhr/fetch on the interaction. This works with eager and lazy routes in an Angular SPA.

## v1223

### Refactor loader architecture for improved developer experience
This architectural release simplifies file structure and refactors the way features are composed, in preparation for future developer experience improvements. These changes are not anticipated to have impact on agent behavior or functionality.

## v1222

### EXPERIMENTAL - Unblock instrumented pages from the back/forward cache (w/ feature flag)
An instrumented page's back-forward cache eligibility was hampered by the agent's `unload` listener, which will be _removed_ when a feature flag is on. With the `allow_bfcache` enabled in the `init` config, the agent's definition of (the end of) an user's session is more refined, and it will no longer be blocking the browser from utilizing its respective b/f cache.

### Prevent feature from collecting and harvesting future data if account entitlements are invalid
The agent will now attempt to shut down an initialized feature if account entitlements are invalid. Accounts that lack entitlements to use certain endpoints will see many 403 errors in the console without this behavior. This behavior requires the Page View Event feature to be enabled.

### Do not collect XHR events for data URLs
AJAX events for data URLs have not historically been collected due to errors in the agent when handling URLs without hostnames. Going forward, XHR calls to data URLs will not cause agent errors and will continue to be excluded from collection.

### Reduce size of builds for modern browser targets
The agent is now compatible with _only modern web syntax (ES6+)_; **this reduces loader size for these browsers by 20% or more**. We target and test support for just the last ten versions of Chrome, Edge, Safari, and Firefox -- see [browser agent EOL policy](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/browser-agent-eol-policy/) for more details.

### Fix nrWrapper exclusion in error stack traces
Restoring previous functionality whereby the `nrWrapper` agent method should be excluded from JavaScript error stack traces.

### Fix errors with global self redefinition
Fixing an issue where external code redefining the `self` global variable causes the agent async loading to fail and the agent to crash.

### Fix check for sessionStorage object
Ensure the agent does not crash when sessionStorage is not available or when the quota has been exceeded or set to 0. Safari has been known to set the sessionStorage quota to 0 in private browsing windows.

## v1221

### Add infrastructure to run on web workers
The agent's infrastructure will now allow for the agent to be built to run on web workers for future projects.

### Expose webpack library as output type "self" vs. "umd"
To address "mismatched anonymous define" errors thrown by RequireJS, the agent's webpack library output will no longer include UMD checks for CommonJS and AMD module environments, and will instead be exposed globally via `self`.

### Fix custom attribute handling in cases where the info block is loaded after initialization
Fixed an issue where custom attributes could be cleared and reset if the info block was included on the page below the loader script. Our guidance still remains that **all configurations should be included on the page above the loader code**, however this is an attempt to do no harm when feasible for backwards compatibility.

### Update JS error bucketing algorithm
The Agent will now take into account the error object type, message, and original stack trace when deciding on whether multiple JS errors should be bucketed together.

### Detect Workflow Changes
PRs will run an action to detect workflow changes for a warning layer against vulnerability.

### Fix initial page load interaction reporting with Nuxt
Fixed an issue where when using the SPA loader with Nuxt, the initial page load interaction was never being completed. This resulted in events like errors being retained in memory and never harvested because they were tied to an incomplete interaction.

### Fix error with jsPDF library and SPA agent
Fixed an issue with the jsPDF library where it was not correctly detecting browser native support for Promises due to our wrapper. This resulted in an exception and jsPDF not generating the PDF. This issue is not present with the pro or lite agent.

**Note**: This issue does not affect the pro or lite agent. This change allows the jsPDF library to function correctly when the spa agent is used. However, it does cause an internal error within the agent to be generated. This error does not break the agent, jsPDF, or other functionality. The issue is planned to be addressed in a future update.

### Ship automated PR builds to internal dev components for comparison with stable build
Pull requests will now generate and ship a build which gets consumed by NR1 `dev` components

## v1220

* Internal NR Platform release date: 10/5/2022
* Production APM-injected release date: 10/6/2022
* Production Standalone release date: TBD

### Capture unhandled Promise rejections
The Agent will now observes and captures __*unhandled*__ Promise rejections as JavaScript Error objects.

### Remove non-ASCII characters from builds
Certain dependencies were appending non-ASCII characters to build files. These characters were affecting older Python agent implementations downstream that worked to encode the agent snippet. The build files are now checked and cleaned of non-ASCII characters before shipping.

### Removed 3rd Party Cookies

The browser agent no longer uses 3rd party cookies to maintain and track session information.  1st party implementation using `window.sessionStorage` is now used, which is automatically cleared when a page session ends.

### LCP is no longer reported on initialliy hidden pages

LCP metrics are no longer reported on pages whose state is hidden at load time, such as tabs refreshing in the background of a focused tab.

### Async Module Loading

Individual features of the browser agent can now be dynamically loaded, enabled, or disabled at runtime.

### Removal of script tag injection

The agent no longer inserts other features into the page via a script tag insertion.  It now uses network requests to instantiate other code modules.

### Updated test process
In an effort to better support the majority of our traffic, the test suite required to merge PRs has been updated to run against the __latest 10 major versions__ of Chrome, Firefox, Edge, Android, and the __latest 5 major versions__ of Safari and iOS. As part of this process, outdated code and polyfill libraries aimed at supporting deprecated browsers are no longer included in production builds by default.

### Polyfilling

Polyfills for IE11 have been included with the agent bundle.

### Fixed issue with BrowserInteraction nodes generating circular references

BrowserInteractions no longer generate circular trees when they are self referential
## 0.0.9-beta.121 (2022-05-27)
**Note:** Version bump only for package newrelic

## v1216

* Internal NR Platform release date: 4/19/2022
* Production APM-injected release date: 4/20/2022
* Production Standalone release date: 4/27/2022

### Introduced obfuscation mechanism to payloads

Added internal mechanism for applying regex and replacement rules to all strings in payloads to obfuscate before sending to ingest.

### Automatically obfuscate `file://` protocol

A change has been implemented in our handling of applications hosted locally on a `file://` protocol. For security reasons, we can not send payloads that contain file information, so our previous implementation revolved around completely shutting the agent down when `file://` protocols were detected. This change introduces the ability to obfuscate all `file://` paths from our payloads before sending to ingest.

### Fixed issue with trace ID random hex character length

The final character in trace ID hex generation was returning as `undefined`, which translated to always be `0` (`undefined & 15 === 0`).  This change fixes this final character and ensures it is valid.
## v1215

* Internal NR Platform release date: 01/24/2021
* Production APM-injected release date: 01/25/2021
* Production Standalone release date: 01/31/2021

### Collect supportability metrics for front end frameworks

Added front end framework detection metrics to help guide future priorities for browser agent features. The following front end frameworks will now be detected and analyzed:
- React 
- Angular
- AngularJS
- Backbone
- Ember
- Vue
- Meteor
- Zepto
- Jquery

## v1214

* Internal NR Platform release date: TBD
* Production APM-injected release date: TBD
* Production Standalone release date: TBD

### Exclude Data URL requests from Ajax events and metrics

Previously, XMLHttpRequest and Fetch calls made with [Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) could prevent the agent from harvesting data.

### Updated LCP identifying attributes to have less generic names

Renamed LargestContentfulPaint PageViewTiming attributes from `url` to `elUrl` and `tag` to `elTag`. This makes the names less generic and as a result less likely to collide with custom attributes.

## v1213

* Internal NR Platform release date: 12/06/2021
* Production APM-injected release date: n/a
* Production Standalone release date: n/a

### Included page view timing data in session trace payload

The agent will now include core web vitals page view timings in the session trace waterfall payload. If observed, events such `FI`, `FID`, `LCP`, `FP`, `FCP` etc. will now be available in the browser `Session Traces` UI grouped under the `timing` type.

### Added session trace IDs to harvests

If a session trace ID exists, it will now be appended to harvests for the linking of session-related datasets downstream. This ID will be appended to any payload that exists at the time the session ID is determined, meaning the only harvests which won't have a session ID are `PageView` and `Initial Page Load Browser Interaction`.

### Added NetworkInformation attributes to LCP & FI

The core web vitals metrics `LCP` and `FI` will now include metadata describing the [network information](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation) observed on the page.  This includes [network type](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/type), [round trip time (rtt)](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/rtt) and [downlink](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/downlink).

### Added element identification attributes to LCP

`LCP` metrics will now also report a [tag name](https://developer.mozilla.org/en-US/docs/Web/API/Element/tagName) and an [image URL](https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint/url) if present (for LCP triggered by images).

## v1212

* Staging release date: 11/04/2021
* Production APM-injected release date: 11/08/2021
* Production Standalone release date: 11/16/2021

### Updated LCP tracking

Largest Contentful Paint will now stop being tracked when page visibility changes to hidden. This aligns with the [web-vitals](https://github.com/GoogleChrome/web-vitals) library.

### Added passive flag to addEventListener calls

Using the addEventEventListener without the passive flag for the `touchstart` event is flagged in Lighthouse. The passive flag is now applied to all addEventListener calls in the agent.

### Fixed issue with Array.isArray() call

`Array.isArray()` call is not supported on old browsers and can cause a runtime error. This call has been replaced with an alternative that works on older browsers.

### Fixed issue with null function argument in the addEventListener API

When a null value was passed in to the addEventListener API, the agent would report an internal error. This edge case is now being handled.

### Fixed issue with Ajax deny list

There was an edge case where certain ajax calls could have been excluded when they should not have been. This is now handled correctly.

### Added support for collecting internal/supportability metrics

The agent can now send metrics that capture information about how the agent itself is working internally.

### Added agent supportability metrics for tracking API usage

### Added agent supportability metrics for tracking excluded Ajax events


## v1211

* Staging release date: 09/27/2021
* Production APM-injected release date: 09/29/2021
* Production Standalone release date: 10/21/2021

### AjaxRequest events for all XHR/fetch requests

Previously, XHR/fetch requests were captured as AjaxRequest events only when they were part of a route change. With this change, all requests will be captured as events. This feature can be further configured by specifying which requests should not be collected.

### Span events are for all XHR/fetch requests

Previously, Span events were generated only for XHR/fetch requests that were part of a route change. With this change, all requests will be captured as Spans.

### Update to Cumulative Layout Shift calculation

The CLS calculation has been updated to use session windows in order to align with Google Chrome tooling (Lighthouse, PageSpeed Insights, CrUX). For more information, see this [blog post on web.dev](https://web.dev/cls-web-tooling/).

### Fixed issue with clearing Resources Buffer

The agent no longer calls the `clearResourceTimings` API, which had the potential to affect other scripts from accessing all resources. Instead, it now uses the `PerformanceObserver` API to collect information about resources.

### Removed Opera from test matrix


## v1210

* Staging release date: 07/01/2021
* Production APM-injected release date: 07/06/2021
* Production Standalone release date: 07/19/2021


### PageHide PageViewTiming events are now accounted for during page unload events
`PageHide` PageViewTiming events are used to query CLS values. In cases where the page was never hidden, inconsistencies would arise because the PageViewTiming event with that type would not be collected.  Now when `pageUnload` fires, if a `pageHide` PageViewTiming has not already been set, it will set it to the time of unload. 

### Perfect Cumulative Layout Scores (CLS) are now recorded as 0
Perfect CLS scores were being ignored, because a score was only recorded when content shifted.  This change reports perfect scores as 0, fixing inconsistent CLS queries.

### Record fetch calls as metrics
Fetch calls are currently only recorded as AjaxRequest events with SPA browser interactions. This change records fetch calls as AJAX metrics, which will make them visible in the AJAX UI charts.


## v1209

* Staging release date: 05/24/2021
* Production APM-injected release date: 05/26/2021
* Production Standalone release date: 6/2/2021


### Doubled the limit of PageAction events per harvest
Up to 120 PageAction events can be harvested every 30 seconds.

### Prevent duplicate session trace nodes
The final Session Trace node in a harvest, captured using the Resource Timing API, is no longer duplicated in the subsequent harvest.

This issue lead to 1 duplicate node in a Session Trace, every 10 seconds, over the duration of the trace.

### Memory overhead when agent script 
Fixed a memory leak in the agent when the network request to load the second part of the agent is blocked.

### Update to file protocol restriction
Fixed an error thrown in the console when the agent is loaded using the `file://` protocol caused by features in the agent trying to run when others had been aborted.

### Removed call to /ping endpoint
Removed a legacy behavior used to ensure network connection was kept alive in IE 7/8/9.

### setTimeouts without callback functions 
Fixed an issue where route change Browser Interactions would wait forever if a setTimeout was called without a callback function ([passing code in as a string in the first argument](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#syntax)) as the first argument.

### Cypress.io
Fixed a conflict between the Browser agent and the Cypress.io test framework when instrumenting XMLHttpRequest.

## v1208

* Staging release date: 03/10/2021
* Production APM-injected release date: 03/11/2021
* Production Standalone release date: 03/22/2021

### Retry harvest network requests

The agent retries harvest XHR requests when it receives 408, 429, 500 or 503 response codes.

### File protocol disallowed

The agent will not report any data when it is on a page opened from a local file.

## v1198

* Staging release date: 01/29/2021
* Production APM-injected release date: 02/01/2021
* Production Standalone release date: 02/08/2021

### Send metrics harvest as POST body

The agent now sends JS errors and AJAX metrics data as body of a standard XHR request. 

## v1194

* Staging release date: 01/07/2021
* Production APM-injected release date: 01/11/2021
* Production Standalone release date: 01/19/2021

### Optimized instrumentation of promises

The promise instrumentation has been updated to reduce performance overhead on web sites that use a large number of promises.

### Fixed issue with SPA overhead

In a rare case where large number of callbacks are executed at the end of an interaction, the agent could cause a significant overhead. This has been fixed in this version of the agent.

### Fixed issue with Fetch instrumentation

Added handling for the use of fetch with a URL object.


## v1177

* Staging release date: 08/18/2020
* Production APM-injected release date: 08/19/2020
* Production Standalone release date: 08/26/2020

### [Timing] Added pageHide and windowLoad PageViewTiming events

The agent now reports two additional types of timing values as PageViewTiming events - pageHide and windowLoad. The `pageHide` value represents the first time that the page was hidden (e.g. by switching browser tab). Note that we only collect the first pageHide events at this point. This timing is useful alongside with its CLS (Cumulative Layout Shift) attribute.

In addition, the agent now also collects the legacy window load value as a PageViewTiming event. This is useful to query and visualize this metric alongside other types of timing events.

### [Timing] Added Cumulative Layout Shift

The agent now collects CLS (Cumulative Layout Shift) values as attributes on PageViewTiming events. CLS measures how much layout of the page shifts and is represented as a score. All types of PageViewTiming events (except FP and FCP) include this attribute, showing the score up until the point the timing measurement was taken.

### [Timing] Fixed unrealistic high values for First Interaction

Older browsers report Event.timeStamp as an epoch time instead of value relative to the page navigation start. The agent took this into account for FID (First Input Delay) timing values but not for FI (First Interaction), which goes hand in hand with FID. With this fix, there should no longer be unrealistic outlier values for FI values.

## v1173

* Staging release date: 07/23/2020
* Production APM-injected release date: 07/28/2020
* Production Standalone release date: 08/03/2020

### [DT] W3C TraceContext headers

The agent can now use the W3C TraceContext headers in addition to and instead of the newrelic proprietary header.

## v1169

* Staging release date: 05/20/2020
* Production APM-injected release date: 05/28/2020
* Production Standalone release date: 06/01/2020

### [Privacy] Added ability to enable/disable cookies

The agent now accepts new configuration `privacy.cookies_enabled`. When it is set to false, the agent does not write any cookies, and it also notifies the intake server to not return a cookie. This enables customers to comply with GDPR privacy rules around cookies.

### [xhr] Fixed issue with document XHR requests

In some cases, the agent was causing a DOMException error when getting size of XHR responses for requests with `document` response type.

## v1167

* Staging release date: 02/07/2020
* Production APM-injected release date: 02/07/2020
* Production Standalone release date: 02/07/2020

### [Timing] Fixed a script error on old IE browsers

Resolved a bug that caused a script error when the windowUnload event fired. This issue affected only Internet Explorer prior to version 9.

## v1163

* Staging release date: 02/03/2020

### [Timing] Largest Contentful Paint

The agent is now capturing Largest Contentful Paint (LCP) as a new type of the PageViewTiming event. For more information about LCP, see [this article](https://web.dev/lcp/) from Google.

### [Timing] Window Unload timing

The agent is now capturing the timing of the [Window unload](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event) event as a new type of the PageViewTiming event.

### [XHR] Fixed capturing response size for requests with *ms-stream* response type

Requests with ms-stream data were previously causing errors in the agent.

## v1158

* Staging release date: 12/18/2019
* Lite release date (US): 12/19/2019
* Lite release date (EU): 12/19/2019
* Pro / Enterprise release date: 12/19/2019
* Standalone/Current release date: 12/30/2019

### [DT] Distributed Tracing for cross-origin AJAX calls

The agent can now add the `newrelic` DT header to outgoing cross-origin AJAX calls. The origins that the agent should add headers to must be defined in the `distributed_tracing.allowed_origins` configuration section.

## v1153

* Staging release date: 11/08/2019
* Lite release date (US): 11/14/2019
* Lite release date (EU): 11/19/2019
* Pro / Enterprise release date: 11/19/2019
* Standalone/Current release date: 11/21/2019

### [Timing] New PageViewTiming Event to capture User Centric Perceived Performance metrics in real time

With this release, we are tying together the visual and responsiveness performance for our customer's site. With every page view, the agent is now capturing the time of the first interaction along with FID (First Input Delay). The existing paint timing metrics (First Paint and First Contentful Paint) are now collected even when they occur after the load event. All of these new metrics are captured on the new PageViewTiming events, available in Insights. This new event type is available for all agents, but requires a Browser Pro subscription.

### [DT] Distributed Tracing for same-origin AJAX calls

The agent can now capture Span events for DT traces. This is accomplished by adding the custom `newrelic` header to outgoing AJAX calls. In this release, the agent adds this header only to same-origin requests. The feature must be enabled using the `distributed_tracing` configuration section.

## v1149

* Staging release date: 11/01/2019
* Lite release date: 11/05/2019

### [Timing] Added First Interaction with delay (FID), improved FP and FCP accuracy

With every page view, the agent is now capturing the time of the first interaction along with FID (First Input Delay). The existing paint timing metrics (FP and FCP) are now collected even when they occur after the load event. All of these new metrics are captured on the new PageViewTiming events in Insights.

### [SPA] Browser interactions now wait on external scripts to finish loading

Browser interactions measure the time of all Javascript code that runs as a result of an interaction. The agent now includes the time it takes to load and execute external scripts. This is useful, for example, when the code started by an interaction must be loaded first (lazy loading).

## v1130

* Staging release date: 07/11/2019
* Lite release date: 07/16/2019
* Pro / Enterprise release date: 07/18/2019
* Standalone/Current release date: 07/25/2019

### [RUM][SPA] First Paint and First Contentful Paint values are now being collected

For browsers that implement the Paint Timing API, the agent will now collect paint timing values and make them available as attributes on the PageView and BrowserInteraction (initial-load only) events.

### [SPA] Updated instrumentation of the History API

The history API methods are now instrumented on the History object constructor.  This is to ensure that our instrumentation does not override other libraries that wrap these methods.

### [SPA] Updated instrumentation of DOM API methods

The DOM API methods used for JSONP instrumentation are now instrumented on the Node object prototype (as opposed to HTMLElement lower in the prototype chain). This is to ensure that our instrumentation does not override other libraries that wrap these methods.

## v1123

* Staging release date: 04/17/2019
* Lite release date: 04/19/2019
* Pro / Enterprise release date: 04/19/2019
* Standalone/Current release date: 04/26/2019

### [XHR] Fixed capturing status code for Angular apps

Angular calls abort() on the XHR object after it successfully finishes.  This was seen by our instrumentation as a call that did not finish, and as a result status code was set to `0`.  This fix addresses this use case by capturing status code earlier in the call stack.

## v1118

* Staging release date: 01/02/2019
* Lite release date: 01/04/2019
* Pro / Enterprise release date: 01/08/2019
* Standalone/Current release date: 01/14/2019

### [ERR] Custom attributes are now included on JavascriptError events.

This includes custom attributes added using the setCustomAttribute(), interaction.setAttribute(), and noticeError() APIs.

### [API] The noticeError() API now accepts custom attributes as an additional argument.

### [RUM] The page URL query param now contains value of the URL at the time the RUM call is made

Currently, we are using the referer header value from the RUM call for transaction naming and for URL attributes on Insights events.  The agent also sends the URL value as a query parameter with the RUM call to get around HTTP header stripping.  This update brings the query parameter value on a par with the HTTP header by capturing it at the time the RUM request is made (to account for redirects).

## v1099

* Staging release date: 10/02/2018
* Lite release date: 10/04/2018
* Pro / Enterprise release date: 10/08/2018
* Standalone/Current release date: 10/17/2018

### [SPA] Action Text

The agent now captures the text of the HTML element that was clicked when a browser interaction started.  This value is stored as an attribute called actionText on the BrowserInteraction events.

There is also a new API `actionText`, which can be used to manually set the action text value.

### [Harvest] The agent now uses a fallback method for collecting data when sendBeacon fails

Browsers can return false from sendBeacon call when it cannot be completed.  The agent now detects it and falls back to a different method to ensure data is captured.

### [ERR] Fixed calculating stackHash value in Safari 10 and 11

The stackHash value was not being properly calculated for global errors in Safari 10 and 11, causing incorrect grouping of errors across all browsers.

### [SPA] Fixed issue with calling fetch without any arguments

On certain versions of the Safari browser, calling fetch without any arguments is permitted.  Other browsers, in contrast, do not allow this and throw an error.  This also prevented the agent from working properly.

### [SPA] Removed response size calculation for streaming fetch calls

Previously, the agent cloned the response of a fetch call and read the response body in order to capture its size.  In certain versions of the Safari browser this caused other clone calls to fail.  As a result, the agent now only uses the `content-length` header, when available, to capture response size.

## v1071

* Staging release date: 11/14/2017
* Lite release date: 11/28/2017
* Pro / Enterprise release date: 12/04/2017
* Standalone/Current release date: 12/08/2017

### [SPA] Add JS Errors to Browser Interactions

When a JS error occurs inside a browser interaction event, the error will now be
associated with the interaction via Insights attributes. The JavaScriptError Insights
event will have `browserInteractionId` and `parentEventId` attributes, and BrowserInteraction,
AjaxRequest and BrowserTiming events will have `browserInteractionId`, `eventId`, and `parentEventId`
attributes.

### [SPA] Fixed JSONP Safari bug

Previously, the agent would cause Safari browsers to lock up when JSONP requests
returned large data. The agent no longer calculates JSONP response size.
https://newrelic.atlassian.net/browse/JS-3486

## v1059

* Staging release date: 09/27/2017
* Lite release date: 10/02/2017
* Pro / Enterprise release date: 10/04/2017
* Standalone/Current release date: 10/11/2017

### [SPA] Add JSONP Support

Browser Interactions that include JSONP requests are now correctly tracked.
Previously, browser interactions that included JSONP were ended early and not
included in the `Breakdowns` tab.

### [SPA] Fixed a compatibility issue with zone.js

When New Relic and Zone.js v0.8.13 were used together, the context (`this`) was not
being set correctly in `addEventListener` calls.

### [Harvest] Correctly send data when methods aren't wrappable

When XHR was not wrappable, the agent did not send data to the collector via XHR.
We are now correctly sending the data if XHR exists on the page, even if it's not
wrappable.

## v1044

* Staging release date: 06/30/17
* Lite release date: 07/05/17
* Pro / Enterprise release date: 07/10/17 1:20PM Pacific
* Standalone/Current release date: 07/17/17 9:15AM Pacific

### [SPA] Improve aggregator performance

The agent verifies interactions are complete by setting and clearing multiple
timers. Previously, the agent would make many unnecessary calls to clearTimeout,
and will noow only clear timers when appropriate.

### [STN] Protect against custom events

When the agent determine the event origin for Session Traces. In some libraries,
that use custom event wrappers, when the agent calls `target` on an event it can
throw an exception. The agent will now catch the exception when building the
Session Traces.

## v1039

* Staging release date: 06/08/17
* Lite release date: 06/13/17
* Pro / Enterprise release date: 06/15/17
* Standalone/Current release date: 06/22/17

### [SPA] Do not instrument SPA without wrappable XHR

On a mobile Safari browser all XHR's are not wrappable, resulting in errors in our agent. This change will no longer instrument SPA on these devices.

### [setTimeout] Support setTimeout with a string duration

When you call `setTimeout` with a string as the duration, browsers will cast this as a number, but the agent did not handle this correctly. We are now handling this case correctly.

### [XHR] Work around mutation observer memory leak in IE 11

We have discovered that MutationObserver in IE causes a memory leak, so the agent now will prefer `setImmediate` for IE, and use a resolved promise to schedule the wrapping in Edge (and other browsers that support promises).

### [SPA] Handle short recursive timers

Some libraries recursively set timers that left our interactions open. The agent now handles this by reducing the max time allowable to be included in the interaction.

## v1026

* Staging release date: 03/07/17
* Lite release date: 03/09/17
* Pro / Enterprise release date: 03/13/17
* Standalone/Current release date: 03/20/17

### [INS] Increase harvest interval from 10s to 30s

Currently, we limit PageAction events to 120 per page load and only 20 events per harvest cycle, resulting in
dropped data if a user sends more than 20 pageAction events in a single burst. Increasing the harvest time
to 30 seconds also increases the event buffer, allowing users to send up to 60 events per harvest.

### Improve data accuracy by using a monotonic clock

The agent uses the system clock to calculate some timings, and since the system clock can change
over the lifecycle of a page, the agent will occasionally report inaccurate or unexpectedly negative values.
Going forward, the agent will use `perfomance.now()`, which is a monotonically increasing clock that starts
from navigationStart. This change will result in more accurate timing for modern browsers.

### [wrap-event] Preserve event listener functions when the agent doesn't load correctly

`add-` and `removeEventListener` should function the same whether the agent is present or not. This change completes
the bug fix from v993.

## v1016

* Staging release date: 01/06/17
* Lite release date: 01/10/17
* Pro / Enterprise release date: 01/13/17
* Standalone release date: 01/19/17
* Current release date: 01/19/17

### [Sourcemaps] Release ID's API Renamed

The release api was renamed from `addReleaseId` to `addRelease`, however the arguments did not change.

### [submit-data] XHR With Credentials

Previously, when the agent would send data using an XHR, it would feature-check the `withCredentials` property and set it to `true` if it was available. However, older versions of IE do not allow modification of the `withCredentials` property on unsent XHRs. The agent now wraps the property assignment in a try/catch block to prevent errors.

## v1009

* Staging release date: 11/18/16
* Lite release date: TBD
* Pro / Enterprise release date: TBD
* Standalone release date: TBD
* Current release date: TBD

### Release ID's API

A new API was added that allows the client to inform us what version of their JavaScript is currently being ran, so they can access a richer error feature by helping match up which source maps can be used.

### Scroll Listener

Previously, the wrapped scroll event listener did not take advantage of an available performance optimization: the passive annotation. By including this annotation, our wrapped scroll listener will allow a non-blocking, smooth scrolling action.

## v998

* Staging release date: 10/27/16
* Lite release date: 11/1/16
* Pro / Enterprise release date: 11/3/16
* Standalone release date: 11/10/16
* Current release date: 11/10/16

### [EE] - Fixed how we handle backlog draining

A series of changes created an issue that caused the event-emitter to drop the
backlog after 30 seconds.

## v995

* Staging release date: 10/4/16
* Lite release date: 10/5/16
* Pro / Enterprise release date: 10/10/16
* Standalone release date: TBD
* Current release date: TBD

### [wrap-event] Fixed a bug with addEventListener wrapping introduced in v993.

Previously Objects implementing the EventListener interface which were registered for multiple events, could only be removed for the last event they were registered for.

## v993

* Staging release date: 9/22/16
* Lite release date: TBD
* Pro / Enterprise release date: TBD
* Standalone release date: TBD
* Current release date: TBD

### [EE] Fixed a compatibility issue with zone.js

Previously when the agent and zone.js were both included on a page, additional
event handlers would be triggered twice. For example, when event handlers were
added as properties, such as `onreadystatechange`, these handlers would be
triggered twice in some browsers.  This issue has now been resolved.

### [wrap-function] Fixed a bug with cross-frame callbacks

Previously, when adding event handlers for events in iframes, the agent
would attempt to wrap the provided callbacks. When the wrapping logic called
the callback belonging to another frame, a permissions exception would be
thrown. The agent will now only wrap callbacks created in the same frame.

### [EE] Agent no longer leaks memory when it does not load correctly

Previously, the agent would continue to buffer events to be processed and
harvested, even if the aggregator portion of the agent failed to load.  The agent
now will clear the buffers and stop emitting events if it detects a failure, or
if the rum request has not completed within 30 seconds of the load event.

### [INS] Agent no longer mutates the attributes object passed to the `addPageAction` API

Previously the agent would mutate the attributes object passed to add page actions
by adding the default and page attributes onto this object.

### [API] Added the `setCurrentRouteName` API method

The agent now has an api method to set the current route name for the page.
This api can be used to set the `previousRouteName` and `targetRouteName` for
`BrowserInteraction` events.

### [Harvest] Disabled insecure communication with the router

Previously the agent would send rum data to the router without TLS if the
request was initiated from an insecure page.  Now the agent will always use
TLS connection when transmitting data.

## v974

* Staging release date: 8/16/2016
* Lite release date: 8/18/2016
* Pro / Enterprise release date: 8/18/2016
* Standalone release date: 8/24/2016
* Current release date: 8/24/2016

This release adds a new setErrorHandler api to agent which allows
applications to see the errors collected by the agent, and optionally
ignore them.

## v971

* Staging release date: 8/10/2016
* Lite release date: 8/15/2016
* Pro / Enterprise release date: 8/17/2016
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Add support for keyboard change events

Browser interaction events are now triggered by keyboard events as part of
creating the interaction.

### Change harvest to not use sendBeacon

We now use the `sendBeacon` native API only for page unload.
This api restricts the amount of data it can send, so we will use
xhr when it is available and save `sendBeacon` for `unload` events.

### [SPA] Browser Timing Events now have Traced Callback Duration

We started sending back traced callback durations with the browser timing
events. This is to match the attributes of other events.

## v963

* Staging release date: 7/5/2016
* Lite release date: 7/6/2016
* Pro / Enterprise release date: 7/7/2016
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Finalize the browser interaction api

Previously the browser interaction api was only available in
the spa loader used by our beta customers. The stubs for the api
are now available in all loaders to allow switching between
loaders without worrying about calling unavailable apis.

### [SPA] Remove stubs for deprecated interaction api

Previously the browser interaction stubbed out a deprecated version
of the interaction api that was used briefly by beta customers. In
this release this deprecated api is being removed completely.

#### [SPA] Update fetch instrumentation

Previously the agent did not properly wrap the fetch api during
browser interactions. The agent now correctly wraps fetch, and the
the body getter methods on Request and Response objects. It also
correctly clones the fetch body before it is used to insure the agent
can correctly measure responseBodySize.

### [SPA] Support hash-based routing

Previously, SPAs that used hash-based routing would need to use
the API to get meaningful names for their route change data,
because the agent would strip the fragment from a URL and save
only the path. The agent now sends the hash part of the fragment
along with the path by default.

### [SPA] Add queueTime and appTime

The addition of queueTime and appTime provides application timing
data for breakdown charts by passing through server-side timing
attributes.

### [SPA] Fix Promise wrapping in Firefox 38

In Firefox 38, copying the toString method from the native Promise
class throws an error. The agent now returns a String representation
of the original promise function, rather than throwing an error.

## v952

* Staging release date: 6/3/16
* Lite release date: 6/6/16
* Pro / Enterprise release date: 6/10/16
* Standalone release date: TBD
* Current release date: TBD

### [SPA] Update to bel.3 schema

SPA agents now send data using the latest schema, and will now
send navTiming data for initial page loads, and more detailed data
for ajax requests including status codes, and requests/response body
sizes.

## v943

* Staging release date: 5/2/16
* Lite release date: 5/4/16
* Pro / Enterprise release date: 5/5/16
* Standalone release date: 6/6/16
* Current release date: 6/6/16

### Explicitly report the current URL when collection data

When sending data to the router, all requests will now include a new
query parameter which will contain the current url of the page. Previously
the consumer used the referer header to determine the url of the page data
was being collected for. This caused issues for sites that set a referrer-policy
meta tag.

### [SPA] Redesign of the API for SPA

All spa api methods are now attached to an interaction handle returned
by calling newrelic.interaction(). This handle will be bound to the interaction
that was active when it was first created.  The goal of this refactor is to
allow more usecases to be handled by the api, and to reduce confusion caused
by not knowing when an interaction is active.

### Fix recording of PageAction events from newrelic.finished() calls

The `newrelic.finished()` API call now again correctly records a `PageAction`
event with an `actionName` of 'finished' when it is invoked.

### [SPA] Allow endInteraction calls before the window load event

Previously, calling `newrelic.endInteraction` prior to the dispatching of the
window load event would cause SPA interactions after the initial page load to
not be submitted. This has been fixed.

### [SPA] Fix for bogus 'popstate' interactions during page load

Previous versions of our SPA instrumentation would generate bogus
`BrowserInteraction` events with a `trigger` of `popstate` when the hash was
changed during the initial page load interaction in some browsers. This has been
fixed.

### [SPA] Smaller interaction payloads

Previously, each call to `setTimeout` or `setImmediate` that was recorded as
part of an SPA interaction would be sent as a separate record as part of the
data submitted for the interaction. For applications with lots of calls to
`setTimeout(..., 0)`, this would result in unnecessarily large data payloads
being sent to New Relic.

Callbacks passed to `setTimeout` or `setImmediate` will now have their callback
timings rolled into the callback timings of the parent tracer that they were
spawned by instead, reducing the size of the submitted data for each
interaction.

### [SPA] Fix serialization of interaction data containing custom attributes

When a custom attribute with a value of 'undefined' was attached via the
`setInteractionAttribute` or `setCustomAttribute` APIs, any browser interactions
containing that attribute would fail to be serialized correctly, and would thus
not produce `BrowserInteraction` events. This has been fixed.

## v918

* Standalone release date: 5/4/16
* Current release date: 5/4/16

### Fix zone.js compatibility for window.addEventListener wrapping

The way that the JS agent was previously wrapping window.addEventListener was
incompatible with the wrapping approach used by zone.js, which could lead to
breakage of Angular 2 applications, particularly with respect to popstate
handling. This has been fixed.

### Fix wrapping of onreadystatechange callbacks

Previously, the agent's instrumentation of callbacks assigned via the XHR
onreadystatechange property could cause those callbacks to not fire in some
circumstances. Among other things, this affected the firing of some callbacks
passed to jQuery.ajax. This has been fixed, and our test coverage of this area
improved.

## v910

### Fix errors with Angular 2.x applications

Previous versions of the SPA loader would cause a JS error on page load when
used with Angular 2.x applications, due to a conflict with the zone.js library
which is a dependency of Angular 2.x. This has been fixed.

### Introducing initial page load timing

The agent currently measures the page load duration as the time between
navigationStart and the window load event, which is often a poor proxy for load
time as experienced by the user.

The agent now provides another measure of initial page load timing that includes
time spent waiting on XHRs and timers that don't resolve until after the window
load event, and should be a more accurate reflection of user-perceived wait
time.

This new timing is captured in the 'duration' attribute of BrowserInteraction
events with a category of 'Initial page load'. It is currently only availble
when using the SPA loader variant.

### More reliable detection of hash changes in IE and Edge

When instrumenting single-page web applications, the agent relies on detecting
changes to the URL that are made by updating window.location.hash, or by
using the history API in order to determine whether a given interaction should
be counted as a route change or not.

Previously, route changes accomplished through direct assignments to
window.location.hash might not be captured correctly in IE and Edge, but this
has now been fixed.

## v892

### Restore reporting of URLs with JS errors

Version 885 introduced a regression wherein the agent would fail to report URLs
on individual JS error records. This would mean that JS errors might have been
assigned a URL based on the URL at the time they were submitted, rather than the
time they were recorded. This has been fixed.

### Report jsDuration for BrowserInteraction Events

This release bumps the querypack schema version to `bel.2` which adds support
for jsDuration for browser interactions.  It also removes the children property
from attribute nodes, and removes the className property from elementData nodes.

## v885

### Fix instrumentation memory leak

v862 introduced a memory leak in the core event buffering machinery of the
agent, which has been fixed in this release. The JS agent loader buffers events
to be consumed when the aggregator loads, but these buffers were not being
correctly destroyed starting in v862 when events were buffered using the
internal `handle` mechanism.

### Reduce noise in BrowserInteration event data

During development of the SPA feature, we collected data for many different
types of user interaction. Many of these interactions are redundant (ie: mouseup,
mousedown, and click), and added unnecessary noise into the event data. We now
collect data for a subset of user interactions: click, submit, and popstate.

## v881 (Not publicly released)

### Properly account for XHR callbacks made with jQuery.ajax

Previously, the agent would not correctly time XHR callbacks that were set up
using `jQuery.ajax`. It would also fail to include these XHR callbacks in SPA
interactions. This has been fixed.

### Fix duration on SPA BrowserInteraction events

v862 included a bug in the quality of our data collection, resulting in
recording all BrowserInteraction events with a duration of 0 seconds. The agent
now records the correct duration, and had improved test coverage of expected
data.

### Improved SPA custom instrumentation API

The previous SPA custom instrumentation API included two methods with
confusingly similar signatures for tracking asynchronous and synchronous work.
To reduce potential confusion, the two methods have been merged into a single,
more general method: `newrelic.createTracer`.

### Improve support for SPA hash-based routing

Previously, Dirac events would only be written for interactions that resulted
in a route change, but that determination would be made by URL comparison
in the Consumer after the fragment identifier had already been removed by the
agent. Route changes that resulted in changes within the fragment only would be
ignored by the Consumer. Now, the determination of a valid route change is
made in the agent before the fragment is removed, and sent as a flag to the
Consumer.

### Move SPA-specific API methods to SPA loader

Previously, new non-finalized SPA-specific API methods were available in all
loaders. Now, the SPA-specific API will only be available for applications that
opt in to SPA instrumentation by using the SPA loader.

### Fixed SPA interaction early-end timing in Edge

In Edge, some SPA interactions involving Promises might previously have ended
prematurely. This has been fixed.

## v862 (Not publicly released)

### noticeError API now accepts a String argument

Previously, the noticeError API would only accept an Error object. Now,
a user can send either an Error object or a String to the noticeError
endpoint.

### Expanded API for Single-Page-App interaction tracing

Added new methods for attaching custom attributes to traced interactions, ending
interactions early, adding custom segments to interactions, and assigning
custom names to interactions.

These APIs are not yet considered stable and may change before the SPA feature
is released.

### Experimental click-tracking support

The agent now includes a new loader variant called 'cap', which adds
experimental support for capturing clicks as Insights events. This loader
variant is not selectable in the UI, and should currently only be used for
testing purposes.

## v852

### Use sendBeacon to harvest data on page unload when possible

In browsers that support it, the agent will now use `navigator.sendBeacon` to
harvest buffered data on page unload, rather than using a dummy image tag. A
related, issue wherein the next page load could be delayed in Firefox if data
submission took a long time has been fixed.

### Fixed data submission upon navigating away from pages in Safari 9

In Safari 9, pages with `unload` event handlers are allowed into the WebKit page
cache, meaning that those `unload` handlers may never fire. Since the agent
previously relied upon an `unload` handler to submit data when navigating away
from a page, this meant that data submission upon navigating away from a page in
Safari 9 was unreliable. This has been fixed by submitting data from the
`pagehide` event handler instead when possible.

### Improved performance for XHRs with responseType=json

Previously, XHRs requested with responseType='json' would trigger the agent to
parse and re-serialize the response in order to measure the size of the response
body. This could be a performance issue with large JSON responses requested with
responseType='json'. The agent will now instead use XHR progress events to
measure response size in most browsers.

### Remove call to deprecated prefixed function in Chrome 46

A deprecation warning caused by calling `webkitClearResourceTimings` in Chrome 46+
has been fixed (we now prefer the un-prefixed version of this function if
available).

### Fix Access Denied error in >= IE10 compatibility mode

An Access Denied error was thrown when users were running >= IE10 in <= IE9
compatibility mode. The error was caused by submitting session trace data
from a browser that does not support CORS. The agent will now only attempt
session trace collection from browsers with known, working CORS support.

## v793 (non-public release)

### Alpha support for single-page web applications

This version of the agent adds a new 'spa' loader which contains initial support
for tracking route changes within single-page web applications.

## v768

### Fix compatibility with pace.js and rollbar.js

The 3rd-party pace.js and rollbar.js libraries previously would interfere with
New Relic's instrumentation of XMLHttpRequests, causing the 'AJAX' section of
the browser UI to be empty. Compatibility with both of these libraries has been
fixed.

### Improved session trace behavior when window.Event is overwritten

Previously, when application code overwrote the window.Event global, session
traces would be missing entries for event and timer callbacks, and internal
errors would be generated in the agent, leading to unnecessary CPU usage by the
agent when instrumenting high-frequency events. This has been fixed.

## v741

### Fix long hangs when serializing errors containing circular references

When attempting to serialize information about JS errors containing circular
references in their 'message' property, the agent would previously hang for a
long period of time, and then eventually fail to report the error. This has been
fixed.

## v686

### Query string parameters are now stripped from JS error backtraces

Query string parameters on URLs included within JS error backtraces will now be
removed before error information is transmitted to New Relic. In addition,
backtrace frames that reference inline scripts will be reported as 'inline',
rather than the URL of the HTML resource.

### Faster PageAction harvests

PageAction events are now harvested more quickly - every 10s, rather than
every 60s.

### Guard against incorrect monkey-patching of XMLHttpRequest

Some JS libraries monkey-patch XMLHttpRequest in such a way that the `async`
parameter will end up as `false` rather than `true` by default if unspecified.
To work around this, the agent now specifies the value of the `async` flag
explicitly to ensure that its XHRs are asynchronous.
