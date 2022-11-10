var yargs = require('yargs')
const { connectToS3, emptyS3Directory } = require('./s3')


var argv = yargs
    .string('bucket')
    .describe('bucket', 'S3 bucket name')

    .string('role')
    .describe('role', 'S3 role ARN')

    .boolean('dry')
    .describe('dry', 'run the script without actually uploading files')
    .alias('d', 'dry')
    .default(false)

    .string('pr')
    .describe('pr', 'PR name')

    .help('h')
    .alias('h', 'help')

    .argv

const { bucket, pr, dry, role } = argv

console.log("argv", argv)

if (!bucket) {
    console.log("bucket field is empty!")
    process.exit(1)
}
if (!role) {
    console.log("role field is empty!")
    process.exit(1)
}
if (!pr) {
    console.log("PR field is empty!")
    process.exit(1)
}

connectToS3(role, dry).then(() => {
    emptyS3Directory(bucket, pr, dry)
})
