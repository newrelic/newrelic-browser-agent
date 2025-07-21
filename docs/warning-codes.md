<a href="https://opensource.newrelic.com/oss-category/#community-plus"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/dark/Community_Plus.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"><img alt="New Relic Open Source community plus project banner." src="https://github.com/newrelic/opensource-website/raw/main/src/images/categories/Community_Plus.png"></picture></a>
# New Relic Browser Agent Warning Codes

### 1
`An error occurred while setting a property of a Configurable`
### 2
`An error occurred while setting a Configurable`
### 3
`Setting a Configurable requires an object as input`
### 4
`Setting a Configurable requires a model to set its initial properties`
### 5
`An invalid session_replay.mask_selector was provided. * will be used.`
### 6
`An invalid session_replay.block_selector was provided and will not be used`
### 7
`An invalid session_replay.mask_input_option was provided and will not be used`
### 8
`Shared context requires an object as input`
### 9
`An error occurred while setting SharedContext`
### 10
`Failed to read from storage API`
### 11
`Failed to write to the storage API`
### 12
`An obfuscation replacement rule was detected missing a "regex" value.`
### 13
`An obfuscation replacement rule contains a "regex" value with an invalid type (must be a string or RegExp)`
### 14
`An obfuscation replacement rule contains a "replacement" value with an invalid type (must be a string)`
### 15
`An error occurred while intercepting XHR`
### 16
`Could not cast log message to string`
### 17
`Could not calculate New Relic server time. Agent shutting down.`
### 18
`RUM call failed. Agent shutting down.`
### 19
`SPA scheduler is not initialized. Saved interaction is not sent!`
### 20
`A problem occurred when starting up session manager. This page will not start or extend any session.`
### 21
`Failed to initialize the agent. Could not determine the runtime environment.`
### 22
`Failed to initialize all enabled instrument classes (agent aborted) -`
### 23
`An unexpected issue occurred`
### 24
`Something prevented the agent from instrumenting.`
### 25
`Something prevented the agent from being downloaded.`
### 26
`Failed to initialize instrument classes.`
### 27
`Downloading runtime APIs failed...`
### 28
`The Browser Agent is attempting to send a very large payload. This is usually tied to large amounts of custom attributes. Please check your configurations.`
### 29
`Failed to wrap logger: invalid argument(s)`
### 30
`Invalid log level`
### 31
`Ignored log: Log is larger than maximum payload size`
### 32
`Ignored log: Invalid message`
### 33
`Session Replay Aborted`
### 34
`Downloading and initializing a feature failed...`
### 35
`Call to agent api failed. The API is not currently initialized.`
### 36
`A feature is enabled but one or more dependent features have not been initialized. This may cause unintended consequences or missing data...`
### 37
`Invalid feature name supplied.`
### 38
`Call to api was made before agent fully initialized.`
### 39
`Failed to execute setCustomAttribute. Name must be a string type.`
### 40
`Failed to execute setCustomAttribute. Non-null value must be a string, number or boolean type.`
### 41
`Failed to execute setUserId. Non-null value must be a string type.`
### 42
`Failed to execute setApplicationVersion. Expected <String | null>`
### 43
`Agent not configured properly.`
### 44
`Invalid object passed to generic event aggregate. Missing "eventType".`
### 45
`An internal agent process failed to execute.`
### 46
`A reserved eventType was provided to recordCustomEvent(...) -- The event was not recorded.`
### 47
`We tried to access a stylesheet's contents but failed due to browser security. For best results, ensure that cross-domain CSS assets are decorated with "crossorigin='anonymous'" attribution or are otherwise publicly accessible.`
### 48
`Supplied an invalid API target. Must be an <Object> that contains licenseKey and applicationID properties.`
### 49
`Supplied API target is missing an entityGuid. Some APIs may not behave correctly without a valid entityGuid (ex. logs).`
### 50
`Failed to connect. Cannot allow registered API.`
### 51
`Container agent is not available to register with. Can not connect`
### 52
`Unexpected problem encountered. There should be at least one app for harvest!`
### 53
`Did not receive a valid entityGuid from connection response`
### 54
`An experimental feature is being used. Support can not be offered for issues`
### 55
`Register API has been disabled on the container agent`
### 56
`Could not find a matching entity to store data`
### 57
`Failed to execute measure. Arguments must have valid types.`
### 58
`Failed to execute measure. Resulting duration must be non-negative.`
### 59
`Session replay harvested before a session trace payload could be sent. This could be problematic for replays that rely on a trace`
### 60
`Session trace aborted`
### 61
`Timestamps must be non-negative and end time cannot be before start time.`
### 62 
`Timestamp must be a unix timestamp greater than the page origin time`
### 63
`A single event was larger than the maximum allowed payload size`
### 64
`Cannot track object size without parent`