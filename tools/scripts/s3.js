var AWS = require('aws-sdk')
var mime = require('mime-types')
var s3

module.exports = {
  connectToS3: function connectToS3 (role, dry) {
    return new Promise((resolve, reject) => {
      if (dry) return resolve()

      var roleToAssume = {
        RoleArn: role, // argv['role']
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
  },

  emptyS3Directory: async function emptyS3Directory (bucket, dir, dry) {
    if (!dir) return

    const listParams = {
      Bucket: bucket,
      Prefix: dir
    }

    const listedObjects = await s3.listObjectsV2(listParams).promise()

    if (listedObjects.Contents.length === 0) return

    const deleteParams = {
      Bucket: bucket,
      Delete: { Objects: [] }
    }

    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key })
    })

    if (!dry) await s3.deleteObjects(deleteParams).promise()
    else console.log('would have deleted', deleteParams)

    console.log('deleted'.deleteParams, 'recurse?', listedObjects.IsTruncated)
    if (listedObjects.IsTruncated) await emptyS3Directory(bucket, dir)
  },

  uploadToS3: function uploadToS3 (fileName, content, bucket, dry = false, maxAge = 3600, expires) {
    return new Promise((resolve, reject) => {
      console.log('expires?', expires)
      var params = {
        Body: content,
        Bucket: bucket, // argv.bucket,
        ContentType: mime.lookup(fileName) || 'application/javascript',
        CacheControl: `public, max-age=${maxAge}`,
        ...(!!expires && { Expires: expires }),
        Key: fileName
      }

      // if (argv['dry'] === true) {
      if (dry) {
        console.log('running in dry mode, file not uploaded, params:', params)
        return resolve()
      }

      s3.putObject(params, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }
}
