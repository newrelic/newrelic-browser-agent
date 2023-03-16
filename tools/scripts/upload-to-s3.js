
var fs = require('fs')
var path = require('path')
var AWS = require('aws-sdk')
var yargs = require('yargs')
const mime = require('mime-types');

var argv = yargs
    .string('bucket')
    .describe('bucket', 'S3 bucket name')

    .string('role')
    .describe('role', 'S3 role ARN')

    .boolean('skip-upload-failures')
    .describe('skip-upload-failures', "Don't bail out after the first failure, keep trying other requests")

    .boolean('dry')
    .describe('dry', 'run the script without actually uploading files')
    .alias('d', 'dry')

    .boolean('test')
    .describe('test', 'for testing only, uploads scripts to folder named test')
    .alias('t', 'test')

    .boolean('dev')
    .describe('dev', 'for dev early release directory only, uploads scripts to folder named dev')
    .alias('D', 'dev')

    .string('pr')
    .alias('pr', 'pr-name')
    .describe('pr', 'PR name (bucket name)')
    .default('')

    .help('h')
    .alias('h', 'help')

    .argv

if (!argv['bucket']) {
    console.log('S3 bucket must be specified')
    return process.exit(1)
}

if (!argv['role']) {
    console.log('S3 role ARN must be specified')
    return process.exit(1)
}

const buildDir = path.resolve(__dirname, '../../build/')
const builtFileNames = fs.readdirSync(buildDir)

console.log(`found ${builtFileNames.length} files to upload to S3`)

connectToS3().then(async () => {
    const uploads = await uploadFiles()
    console.log(`Successfully uploaded ${uploads.length} files to S3`)
    process.exit(0)
}).catch(err => {
    console.log(err)
    process.exit(1)
})

async function uploadFiles(err) {
    if (err) {
        return reject(err)
    }
    const files = await Promise.all(builtFileNames.map(fileName => {
        return fs.promises.readFile(`${buildDir}/${fileName}`)
    }))


    const uploads = await Promise.all(files.map((f, i) => {
        const fileName = builtFileNames[i]
        const content = f
        return uploadToS3(fileName, content)
    }))

    return uploads
}

function connectToS3() {
    return new Promise((resolve, reject) => {
        if (argv.dry) return resolve()

        var roleToAssume = {
            RoleArn: argv['role'],
            RoleSessionName: 'uploadToS3Session',
            DurationSeconds: 900
        }

        var sts = new AWS.STS()
        sts.assumeRole(roleToAssume, function (err, data) {
            if (err) {
                reject(err)
            } else {
                var roleCreds = {
                    accessKeyId: data.Credentials.AccessKeyId,
                    secretAccessKey: data.Credentials.SecretAccessKey,
                    sessionToken: data.Credentials.SessionToken
                }
                s3 = new AWS.S3(roleCreds)
                resolve()
            }
        })
    })
}

function uploadToS3(fileName, content) {
    return new Promise((resolve, reject) => {
        if (argv['test'] === true) {
            fileName = 'test/' + fileName
        }

        if (argv['dev'] === true) {
            fileName = 'dev/' + fileName
        }

        if (argv['pr']) {
            fileName = 'pr/' + argv['pr'] + '/' + fileName
        }

        var params = {
            Body: content,
            Bucket: argv.bucket,
            ContentType: mime.lookup(fileName) || 'application/javascript',
            CacheControl: 'public, max-age=3600',
            Key: fileName
        }

        if (argv['dry'] === true) {
            console.log('running in dry mode, file not uploaded, params:', params)
            return resolve()
        }


        s3.putObject(params, (err, data) => {
            if (err) reject(err)
            else resolve(data)
        })
    })

}
