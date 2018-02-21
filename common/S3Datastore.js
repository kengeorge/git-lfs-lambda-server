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
        this.doesNotExist = this.doesNotExist.bind(this);
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

    doesNotExist(key) {
        return this.exists(key, true);
    }

    exists(key, invert = false) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        let found = false;
        return this.s3.headObject(params).promise()
            .then(() => {
                found = true;
                return key;
            })
            .catch(() => key)
            //not sure why 'finally' won't work here
            .then(() => {
                if(found && !invert) return key;
                if(!found && invert) return key;
                throw {
                    code: 404,
                    message: `Object ${key} does not exist`
                };
            });
    }
}

module.exports = S3Datastore;
