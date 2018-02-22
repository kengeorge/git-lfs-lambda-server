const AWS = require('aws-sdk');
const Datastore = require('./Datastore.js');

class S3Datastore extends Datastore {

    constructor(bucketName) {
        super();
        this.bucketName = bucketName;
        //Initializing here makes it cleaner to re-mock AWS in tests.
        this.s3 = new AWS.S3();

        //Binding since promises won't call with 'this'
        this.getUrl = this.getUrl.bind(this);
        this.getUploadUrl = this.getUploadUrl.bind(this);
        this.getDownloadUrl = this.getDownloadUrl.bind(this);
        this.getVerifyUrl = this.getVerifyUrl.bind(this);
        this.exists = this.exists.bind(this);
    }

    getUrl(key, action, contentType) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket: this.bucketName,
                Key: key,
            };

            if(contentType) params.ContentType = contentType;

            return this.s3.getSignedUrl(action, params, function(err, data) {
                console.log(params.Key);
                if(err) reject(new Error(err));
                else resolve(data);
            });
        });
    }

    getUploadUrl(key) {
        return this.getUrl(key, 'putObject', "application/octet-stream");
    }

    getDownloadUrl(key) {
        return this.getUrl(key, 'getObject');
    }

    exists(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        return this.s3.headObject(params).promise()
            .then(() => {
                return true;
            })
            .catch((e) => {
                if(e && e.code === "NoSuchKey") return false;

                throw new Error(e);
            });
    }
}

module.exports = S3Datastore;