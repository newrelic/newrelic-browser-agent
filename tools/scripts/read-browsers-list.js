const fs = require('fs')
const core = require('@actions/core')
const path = require('path')

fs.readFile(path.resolve(__dirname, '../jil/util/browsers-supported.json'), 'utf-8', (err, data) => {
    const browsers = Object.values(JSON.parse(data)).flat()
    const commands = browsers.map(b => `${b.browserName.replace('MicrosoftEdge', 'edge').replace('Safari', 'ios')}@${b.version}`)
    core.setOutput('matrix', JSON.stringify(commands))
})
