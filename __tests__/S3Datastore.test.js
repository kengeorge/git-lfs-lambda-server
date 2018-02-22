const AWS = require('aws-sdk-mock');
const S3Datastore = require('../src/common/S3Datastore');
const TEST_BUCKET_NAME = "TEST_BUCKET_NAME";

function makeUrl(operation, bucket, key) {
    return `${operation}:${bucket}/${key}`;
}

const MISSING_KEY = "missingKey";
const EXISTING_KEY = "existingKey";
const startWith = require('kpromise').startWith;

describe('S3Datastore', () => {

    let datastore = null;

    beforeAll(() => {
        AWS.restore();
        AWS.mock('S3', 'getSignedUrl', (operation, params, callback) => {

            if(operation === 'putObject' && params.Key === MISSING_KEY) {
                return callback(null, makeUrl(operation, params.Bucket, params.Key));
            }

            if(operation === 'getObject' && params.Key === EXISTING_KEY) {
                return callback(null, makeUrl(operation, params.Bucket, params.Key));
            }


            return callback("FakeError");
        });

        AWS.mock('S3', 'headObject', (params, callback) => {
            if(params.Key === EXISTING_KEY) return callback(null, {});

            if(params.Key === MISSING_KEY) return callback({
                    code: "NoSuchKey",
                    message: "Mock s3: no such key " + params.Key
                }
            );

            return callback("FakeError");
        });
    });

    beforeEach(() => {
        datastore = new S3Datastore(TEST_BUCKET_NAME);
    });

    afterAll(() => {
        AWS.restore();
    });

    it('Should produce a signed upload url', async() => {
        const given = MISSING_KEY;

        const actual = await startWith(given)
            .then(datastore.getUploadUrl);

        expect.assertions(1);
        expect(actual).toBe(makeUrl("putObject", TEST_BUCKET_NAME, given));
    });

    it('Should produce a signed download url', async() => {
        const given = EXISTING_KEY;

        const actual = await startWith(given)
            .then(datastore.getDownloadUrl);

        expect.assertions(1);
        expect(actual).toBe(makeUrl("getObject", TEST_BUCKET_NAME, given));
    });

    it('Should return true if exists', async() => {
        const given = EXISTING_KEY;

        const actual = await startWith(given)
            .then(datastore.exists);

        expect.assertions(1);
        expect(actual).toBe(true);
    });

    it('Should return false if does not exist', async() => {
        const given = MISSING_KEY;

        const actual = await startWith(given)
            .then(datastore.exists);

        expect.assertions(1);
        expect(actual).toBe(false);
    });

    it('Should throw other errors', () =>{
        expect.assertions(1);
        return expect(datastore.exists("badKey")).rejects.toThrow(/FakeError/);
    });

    it('Should throw other upload URL errors', () => {
        expect.assertions(1);
        return expect(datastore.getUploadUrl("badKey")).rejects.toThrowError(/FakeError/);
    });

    it('Should throw other download URL errors', () => {
        expect.assertions(1);
        return expect(datastore.getDownloadUrl("badKey")).rejects.toThrowError(/FakeError/);
    });

});
