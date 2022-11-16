const core = require('@actions/core')

function getTimeStamp(){
    const now = new Date()
    core.setOutput('timestamp', now.toString())
}

getTimeStamp()