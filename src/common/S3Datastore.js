const Datastore = require('./Datastore.js');
const AWS = require('aws-sdk');

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
        this.exists = this.exists.bind(this);
        this.getInfo = this.getInfo.bind(this);
    }

    getUrl(key, action, contentType) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket: this.bucketName,
                Key: key,
            };

            if(contentType) params.ContentType = contentType;

            return this.s3.getSignedUrl(action, params, function(err, data) {
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

    getInfo(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        return this.s3.headObject(params).promise()
            .catch((e) => {
                if(e && e.code === "NotFound") return null;

                throw new Error(e);
            });
    }


    exists(key) {
        return this.getInfo(key).then(info => info != null);
    }
}

module.exports = S3Datastore;
