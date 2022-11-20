/* eslint-disable */
import request from 'request'
import yargs from 'yargs'
import chalk from 'chalk'

const config = yargs
    .usage('$0 [options]')

    .string('env')
    .describe('env', 'The RPM Admin environment to hit')
    .choices('env', ['staging', 'production', 'eu'])
    .default('env', ['staging', 'production', 'eu'])

    .string('production-api-key')
    .describe('production-api-key', 'API key to use for talking to production RPM site to upload')

    .string('staging-api-key')
    .describe('staging-api-key', 'API key to use for talking to staging RPM site to upload')

    .string('eu-api-key')
    .describe('eu-api-key', 'API key to use for talking to EU RPM site to upload')

    .boolean('v')
    .alias('v', 'verbose')
    .describe('v', 'print extra info about API requests')
    .default('v', false)

    .help('h')
    .alias('h', 'help')
    .strict()
    .wrap(Math.min(110, yargs.terminalWidth()))
    .argv

var postEnvOptions = {
    staging: {
        url: 'https://staging-api.newrelic.com/v2/system_configuration.json',
        headers: {
            'X-Api-Key': config['staging-api-key'],
        }
    },
    eu: {
        url: 'https://api.eu.newrelic.com/v2/system_configuration.json',
        headers: {
            'X-Api-Key': config['eu-api-key'],
        }
    },
    production: {
        url: 'https://api.newrelic.com/v2/system_configuration.json',
        headers: {
            'X-Api-Key': config['production-api-key'],
        }
    }
}

var getEnvOptions = {
    staging: {
        url: 'https://staging-api.newrelic.com/v2/system_configuration/show.json',
        headers: {
            'X-Api-Key': config['staging-api-key'],
        }
    },
    eu: {
        url: 'https://api.eu.newrelic.com/v2/system_configuration/show.json',
        headers: {
            'X-Api-Key': config['eu-api-key'],
        }
    },
    production: {
        url: 'https://api.newrelic.com/v2/system_configuration/show.json',
        headers: {
            'X-Api-Key': config['production-api-key'],
        }
    }
}
const env = Array.isArray(config.env) ? config.env : config.env.split(",")
console.log(chalk.yellow("Will set configs for "), env)

function lineBreak(message) {
    console.log(chalk.yellow(`--------------------------------- ${message} ---------------------------------`))
}

const run = async () => {
    try {
        lineBreak('start')
        const tasks = await Promise.all(env.map(e => import(`../util/deploy/${e}.mjs`)))
        const results = await Promise.allSettled(tasks.map(({ settings }, i) => {
            const payload = config.verbose ? settings.payloadWithComments : settings.payload
            return payload.map(payload => getAndSetValue(env[i], payload))
        }).flat())
        const { successes, failures } = results.reduce((prev, next) => {
            if (next.status === 'rejected') prev.failures.push(next)
            else prev.successes.push(next)
            return prev
        }, { successes: [], failures: [] })
        lineBreak('done')
        console.log(chalk.green(`${successes.length} API updates succeeded`))
        console.log(chalk.red(`${failures.length} API updates failed`))
        if (config.verbose) {
            lineBreak('verbose - success')
            successes.forEach(f => console.log(chalk.yellow('success:'), chalk.green(JSON.stringify(f.value, undefined, 4))))
            lineBreak('verbose - failure')
            failures.forEach(f => console.log(chalk.yellow('failure:'), chalk.red(f.reason)))
        }

        if (failures.length) process.exit(1)
        else process.exit(0)
    } catch (err) {
        console.log(chalk.red('Error...'), err)
        process.exit(1)
    }
}

const setValue = async (env, setting) => {
    const postAPI = postEnvOptions[env]

    var postOptions = {
        method: 'POST',
        followAllRedirects: true,
        json: {
            system_configuration: {
                ...setting
            }
        }
    }

    return new Promise((resolve, reject) => {
        request({ ...postAPI, ...postOptions }, (err, res) => {
            const errors = getErrors(err, res)
            if (errors.length) return reject(`${chalk.white(env)}: ${chalk.gray.underline.italic(setting.key)}: POST failed, ${errors.join(", ")}`)
            resolve({ env, setting })
        })
    })
}

const getAndSetValue = async (env, setting) => {
    const getAPI = getEnvOptions[env]

    var getOptions = {
        method: 'GET',
        followAllRedirects: true,
        qs: { key: setting.key }
    }

    return new Promise((resolve, reject) => {
        request({ ...getAPI, ...getOptions }, (err, res, body) => {
            const prevVal = JSON.parse(body)?.system_configuration?.value
            const errors = getErrors(err, res)
            if (errors.length) {
                console.log(`${chalk.yellow(env)}:`, chalk.red(`Failed to update ${setting.key} to ${setting.value}... ${chalk.underline.bold(`Value is still ${prevVal}`)}`))
                return reject(`${chalk.white(env)}: ${chalk.gray.underline.italic(setting.key)}: GET failed, ${errors.join(", ")}`)
            }
            setValue(env, setting)
                .then(results => {
                    console.log(`${chalk.yellow(env)}:`, chalk.green(`Updated ${setting.key} from ${prevVal} to ${setting.value}`))
                    resolve({ ...results, setting: { ...results.setting, previous: prevVal } })
                })
                .catch(err => {
                    console.log(`${chalk.yellow(env)}:`, chalk.red(`Failed to update ${setting.key} to ${setting.value}... ${chalk.underline.bold(`Value is still ${prevVal}`)}`))
                    reject(err)
                })
        })
    })
}

const getErrors = (err, res) => {
    const errors = []
    if (err) errors.push(err)
    if (res?.body?.error) errors.push(res?.body?.error?.title || JSON.stringify(res?.body?.error))
    if (!String(res.statusCode).startsWith('2')) errors.push(`Invalid status ${res.statusCode}`)
    return errors
}
run()